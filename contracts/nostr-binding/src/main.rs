#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;
mod error;
mod type_id;
mod util;

#[cfg(not(test))]
use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
#[cfg(not(test))]
default_alloc!();

use alloc::ffi::CString;
use alloc::format;
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, core::ScriptHashType, prelude::Unpack},
    debug,
    high_level::{self, exec_cell, load_script, load_witness_args},
};
use hex::encode;

use ckb_hash::blake2b_256;
use error::Error;
use nostr::Event;
use nostr::JsonUtil;
use type_id::{load_type_id_from_script_args, validate_type_id};
use util::get_asset_event_cell_type_id;

include!(concat!(env!("OUT_DIR"), "/auth_code_hash.rs"));

pub fn program_entry() -> i8 {
    match auth() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn auth() -> Result<(), Error> {
    let witness_args = load_witness_args(0, Source::GroupOutput)?;
    let witness = witness_args
        .output_type()
        .to_opt()
        .ok_or(Error::InvalidTypeIDCellNum)?
        .raw_data();
    let event_bytes = witness.to_vec();
    let event = Event::from_json(event_bytes).unwrap();
    let binding = event.signature();
    let signature = binding.as_ref();
    let message = event.id.as_bytes();
    let public_key = event.pubkey.to_bytes();
    let mut signature_auth = [0u8; 96];
    signature_auth[..32].copy_from_slice(&public_key);
    signature_auth[32..].copy_from_slice(&signature.to_vec());

    let mut pubkey_hash = [0u8; 20];
    let args = blake2b_256(public_key);
    pubkey_hash.copy_from_slice(&args[0..20]);

    validate_script_args(event.id().to_bytes())?;
    validate_asset_event(event.clone())?;

    // AuthAlgorithmIdSchnorr = 7
    let algorithm_id_str = CString::new(format!("{:02X?}", 7u8)).unwrap();
    let signature_str = CString::new(format!("{}", encode(signature_auth))).unwrap();
    let message_str = CString::new(format!("{}", encode(message))).unwrap();
    let pubkey_hash_str = CString::new(format!("{}", encode(pubkey_hash))).unwrap();

    let args = [
        algorithm_id_str.as_c_str(),
        signature_str.as_c_str(),
        message_str.as_c_str(),
        pubkey_hash_str.as_c_str(),
    ];

    exec_cell(&AUTH_CODE_HASH, ScriptHashType::Data1, &args).map_err(|_| Error::AuthError)?;
    Ok(())
}

pub fn validate_asset_event(event: Event) -> Result<(), Error> {
    let cell_type_id = get_asset_event_cell_type_id(event);

    let type_id = load_type_id_from_script_args(32)?;
    let script_type_id = encode(type_id.to_vec());
    assert_eq!(script_type_id, cell_type_id);
    Ok(())
}

pub fn validate_script_args(event_id: [u8; 32]) -> Result<(), Error> {
    let mut script_event_id = [0u8; 32];
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    script_event_id.copy_from_slice(&args[0..32]);

    if !script_event_id.eq(&event_id) {
        return Err(Error::AssetEventIdNotMatch);
    }

    let type_id = load_type_id_from_script_args(32)?;
    validate_type_id(type_id)?;
    Ok(())
}
