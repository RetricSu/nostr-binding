#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

mod config;
mod error;
mod type_id;
mod util;

use alloc::vec::Vec;
use ckb_std::debug;
#[cfg(not(test))]
use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
#[cfg(not(test))]
default_alloc!();

use alloc::format;
use alloc::{ffi::CString, string::ToString};
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, core::ScriptHashType, prelude::Unpack},
    high_level::{exec_cell, load_script, load_witness_args},
};
use config::ASSET_META_KIND;
use hex::encode;

use ckb_hash::blake2b_256;
use error::Error;
use nostr::Event;
use nostr::JsonUtil;
use type_id::{load_type_id_from_script_args, validate_type_id};
use util::get_asset_event_cell_type_id;

use crate::config::ASSET_MINT_KIND;
use crate::type_id::has_type_id_cell;
use crate::util::get_first_tag_value;

include!(concat!(env!("OUT_DIR"), "/auth_code_hash.rs"));

pub fn program_entry() -> i8 {
    match auth() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn auth() -> Result<(), Error> {
    let type_id = load_type_id_from_script_args(32)?;
    validate_type_id(type_id)?;

    if !has_type_id_cell(0, Source::GroupInput) {
        // build a new binding cell
        // need to verify nostr asset Event

        // read nostr event from witness
        let witness_args = load_witness_args(0, Source::GroupOutput)?;
        let witness = witness_args
            .output_type()
            .to_opt()
            .ok_or(Error::InvalidTypeIDCellNum)?
            .raw_data();
        let events_bytes = witness.to_vec();
        let events = decode_events(events_bytes);

        if !events.len().eq(&2) {
            return Err(Error::InvalidEventLength);
        }

        let mint_event = events[0].clone();
        let asset_meta_event = events[1].clone();

        let mint_pubkey = mint_event.pubkey.to_bytes();
        let asset_meta_pubkey = asset_meta_event.pubkey.to_bytes();
        let asset_meta_event_id = asset_meta_event.id.to_bytes();

        validate_mint_event(mint_event.clone())?;
        validate_asset_metadata_event(asset_meta_event)?;

        // check if mint_event public key is same with asset meta event
        if !mint_pubkey.eq(&asset_meta_pubkey) {
            return Err(Error::NotAssetOwnerToMint);
        }

        // check if mint_event e tag is same with event_id from asset_meta_event
        let asset_event_id = get_first_tag_value(mint_event, nostr::Alphabet::E);
        if !encode(asset_meta_event_id).eq(&asset_event_id) {
            return Err(Error::AssetEventIdNotMatch);
        }
    }

    Ok(())
}

pub fn validate_mint_event(event: Event) -> Result<(), Error> {
    event.verify_id().unwrap();

    let kind = event.clone().kind.as_u32();
    if !kind.eq(&(ASSET_MINT_KIND as u32)) {
        return Err(Error::InvalidAssetEventKind);
    }

    // todo: check pow

    // check if event tag type id is equal to script type id
    let cell_type_id = get_asset_event_cell_type_id(event.clone());
    let type_id = load_type_id_from_script_args(32)?;
    let script_type_id = encode(type_id);
    if !script_type_id.eq(&cell_type_id) {
        return Err(Error::TypeIDNotMatch);
    }

    // check if event id is equal to script event id
    let script_event_id = load_event_id_from_script_args()?;
    if !script_event_id.eq(event.id.as_bytes()) {
        return Err(Error::AssetEventIdNotMatch);
    }

    validate_event_signature(event.clone())?;

    Ok(())
}

pub fn validate_asset_metadata_event(event: Event) -> Result<(), Error> {
    event.verify_id().unwrap();

    let kind = event.clone().kind.as_u32();
    if !kind.eq(&(ASSET_META_KIND as u32)) {
        return Err(Error::InvalidAssetMetaEventKind);
    }

    validate_event_signature(event.clone())?;

    Ok(())
}

pub fn validate_event_signature(event: Event) -> Result<(), Error> {
    let sig = event.signature();
    let signature = sig.as_ref();
    let message = event.id.as_bytes();
    let public_key = event.pubkey.to_bytes();
    let mut signature_auth = [0u8; 96];
    signature_auth[..32].copy_from_slice(&public_key);
    signature_auth[32..].copy_from_slice(signature.as_ref());

    let mut pubkey_hash = [0u8; 20];
    let args = blake2b_256(public_key);
    pubkey_hash.copy_from_slice(&args[0..20]);

    // AuthAlgorithmIdSchnorr = 7
    let algorithm_id_str = CString::new(format!("{:02X?}", 7u8)).unwrap();
    let signature_str = CString::new(encode(signature_auth).to_string()).unwrap();
    let message_str = CString::new(encode(message).to_string()).unwrap();
    let pubkey_hash_str = CString::new(encode(pubkey_hash).to_string()).unwrap();

    let args = [
        algorithm_id_str.as_c_str(),
        signature_str.as_c_str(),
        message_str.as_c_str(),
        pubkey_hash_str.as_c_str(),
    ];

    exec_cell(&AUTH_CODE_HASH, ScriptHashType::Data1, &args).map_err(|_| Error::AuthFail)?;
    Ok(())
}

pub fn load_event_id_from_script_args() -> Result<[u8; 32], Error> {
    let mut script_event_id = [0u8; 32];
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    script_event_id.copy_from_slice(&args[0..32]);
    Ok(script_event_id)
}

// witness format:
//      total_event_count(1 byte, le) + first_event_length(8 bytes, le) + first_event_content + second_event_length(8 bytes, le)....
pub fn decode_events(data: Vec<u8>) -> Vec<Event> {
    // Ensure we have at least 1 byte for the total number of events
    if data.is_empty() {
        debug!("Not enough data to decode events.");
        panic!("Not enough data to decode events.");
    }

    let mut cursor = 1; // Start after the first byte (total number of events)
    let mut events = Vec::new();

    // Get the total number of events
    let total_events = data[0] as usize;

    // Iterate over each event
    for _ in 0..total_events {
        // Ensure we have enough bytes to read the event length
        if data.len() < cursor + 8 {
            debug!("Not enough data to decode event length.");
            panic!("Not enough data to decode events.");
        }

        // Get the length of the current event
        let event_length_bytes: [u8; 8] = data[cursor..cursor + 8].try_into().unwrap();
        let event_length = u64::from_le_bytes(event_length_bytes) as usize;

        cursor += 8; // Move the cursor to the start of the event data

        // Ensure we have enough bytes to read the event data
        if data.len() < cursor + event_length {
            debug!("Not enough data to decode event.");
            panic!("Not enough data to decode events.");
        }

        // Extract the event data
        let event_data = &data[cursor..cursor + event_length].to_vec();
        let event = Event::from_json(event_data).unwrap();
        events.push(event);

        cursor += event_length; // Move the cursor to the next event length
    }

    events
}
