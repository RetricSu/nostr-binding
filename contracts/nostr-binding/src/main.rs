#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

mod config;
mod error;
mod type_id;
mod util;

use alloc::vec::Vec;
#[cfg(not(test))]
use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
#[cfg(not(test))]
default_alloc!();

use alloc::format;
use alloc::{ffi::CString, string::ToString};
use ckb_std::high_level::load_input_out_point;
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, core::ScriptHashType, prelude::Unpack},
    high_level::{exec_cell, load_cell_data, load_script, load_witness_args},
};
use hex::encode;

use ckb_hash::blake2b_256;
use error::Error;
use nostr::Event;
use nostr::JsonUtil;
use type_id::{load_type_id_from_script_args, validate_type_id};
use util::get_asset_event_cell_type_id;

use crate::config::{ASSET_CONSUME_KIND, ASSET_MINT_KIND};
use crate::type_id::has_type_id_cell;
use crate::util::{
    get_asset_event_cell_outpoint, get_asset_event_initial_owner, get_first_tag_value,
};

include!(concat!(env!("OUT_DIR"), "/auth_code_hash.rs"));

pub fn program_entry() -> i8 {
    match auth() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn auth() -> Result<(), Error> {
    // read nostr event from witness
    let witness_args = load_witness_args(0, Source::GroupOutput)?;
    let witness = witness_args
        .output_type()
        .to_opt()
        .ok_or(Error::InvalidTypeIDCellNum)?
        .raw_data();
    let event_bytes = witness.to_vec();
    let event = Event::from_json(event_bytes).unwrap();

    validate_event_signature(event.clone())?;
    validate_script_args(event.id().to_bytes())?;
    validate_asset_event(event.clone())?;

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

pub fn validate_asset_event(event: Event) -> Result<(), Error> {
    // check if event tag type id is equal to script type id
    let cell_type_id = get_asset_event_cell_type_id(event.clone());
    let type_id = load_type_id_from_script_args(32)?;
    let script_type_id = encode(type_id);
    assert_eq!(script_type_id, cell_type_id);

    // check if output data is equal to first p tag
    let owner_pubkey = get_asset_event_initial_owner(event.clone());
    let pubkey = load_cell_data(0, Source::GroupOutput)?;
    assert_eq!(owner_pubkey, encode(pubkey));

    // check mode requirement
    let kind = event.clone().kind.as_u32();
    if has_type_id_cell(0, Source::GroupInput) {
        // transfer mode, validate consume event
        assert_eq!(kind, ASSET_CONSUME_KIND as u32);

        // validate cell_outpoint tag
        let tag = get_asset_event_cell_outpoint(event.clone());
        let cell_outpoint_vec: Vec<&str> = tag.split(':').collect();
        let tx_hash = cell_outpoint_vec[0];
        let index = cell_outpoint_vec[1];
        let outpoint = load_input_out_point(0, Source::GroupInput)?;
        assert_eq!(encode(outpoint.tx_hash().to_string()), tx_hash);
        assert_eq!(encode(outpoint.index().to_string()), index);

        // validate owner
        let owner = load_cell_data(0, Source::GroupInput)?;
        let pubkey = event.clone().pubkey.to_hex();
        assert_eq!(encode(owner), pubkey);

        // validate e tag
        let event_id = get_first_tag_value(event.clone(), nostr::Alphabet::E);
        let script_event_id = load_event_id_from_script_args()?;
        assert_eq!(event_id, encode(script_event_id));
    } else {
        // mint mode, validate asset event
        assert_eq!(kind, ASSET_MINT_KIND as u32);
        // todo: validate asset metadata
    }

    Ok(())
}

pub fn validate_script_args(event_id: [u8; 32]) -> Result<(), Error> {
    let script_event_id = load_event_id_from_script_args()?;
    if !script_event_id.eq(&event_id) {
        return Err(Error::AssetEventIdNotMatch);
    }

    let type_id = load_type_id_from_script_args(32)?;
    validate_type_id(type_id)?;
    Ok(())
}

pub fn load_event_id_from_script_args() -> Result<[u8; 32], Error> {
    let mut script_event_id = [0u8; 32];
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    script_event_id.copy_from_slice(&args[0..32]);
    Ok(script_event_id)
}
