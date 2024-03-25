#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

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
    ckb_types::core::ScriptHashType,
    error::SysError,
    high_level::{exec_cell, load_witness},
};
use hex::encode;

use ckb_hash::blake2b_256;
use nostr::Event;
use nostr::JsonUtil;

include!(concat!(env!("OUT_DIR"), "/auth_code_hash.rs"));

#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    // Add customized errors here...
    AuthError,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::ItemMissing,
            SysError::LengthNotEnough(_) => Self::LengthNotEnough,
            SysError::Encoding => Self::Encoding,
            SysError::Unknown(err_code) => panic!("unexpected sys error {}", err_code),
        }
    }
}

pub fn program_entry() -> i8 {
    match auth() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn auth() -> Result<(), Error> {
    let event_bytes = load_witness(0, Source::GroupInput)?;
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
    pubkey_hash.copy_from_slice(&args[0..20]); //todo: change to pubkey

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
