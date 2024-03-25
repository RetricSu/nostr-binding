#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

use ckb_hash::{Blake2bBuilder};
#[cfg(not(test))]
use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
#[cfg(not(test))]
default_alloc!();

use alloc::vec::Vec;
use ckb_std::{
    ckb_constants::Source,
    debug,
    error::SysError,
    high_level::{load_cell_type_hash, load_input, load_script, load_script_hash},
    syscalls::load_cell,
    ckb_types::prelude::Entity
};

pub enum Error {
    Syscall(SysError),
    Native(TypeIDError),
}
pub enum TypeIDError {
    // There can only be at most one input and at most one output type ID cell
    InvalidTypeIDCellNum = 4,
    // Type id does not match args
    TypeIDNotMatch,
    // Length of type id is incorrect
    ArgsLengthNotEnough,
}

impl From<SysError> for Error {
    fn from(s: SysError) -> Self {
        Error::Syscall(s)
    }
}

fn has_type_id_cell(index: usize, source: Source) -> bool {
    let mut buf = Vec::new();
    match load_cell(&mut buf, 0, index, source) {
        Ok(_) => true,
        Err(e) => {
            // just confirm cell presence, no data needed
            if let SysError::LengthNotEnough(_) = e {
                return true;
            }
            debug!("load cell err: {:?}", e);
            false
        }
    }
}

fn locate_first_type_id_output_index() -> Result<usize, Error> {
    let current_script_hash = load_script_hash()?;

    let mut i = 0;
    loop {
        let type_hash = load_cell_type_hash(i, Source::Output)?;

        if type_hash == Some(current_script_hash) {
            break;
        }
        i += 1
    }
    Ok(i)
}

/// Given a 32-byte type id, this function validates if
/// current transaction confronts to the type ID rules.
pub fn validate_type_id(type_id: [u8; 32]) -> Result<(), Error> {
    if has_type_id_cell(1, Source::GroupInput) || has_type_id_cell(1, Source::GroupOutput) {
        debug!("There can only be at most one input and at most one output type ID cell!");
        return Err(Error::Native(TypeIDError::InvalidTypeIDCellNum));
    }

    if !has_type_id_cell(0, Source::GroupInput) {
        // We are creating a new type ID cell here. Additional checkings are needed to ensure the type ID is legit.
        let index = locate_first_type_id_output_index()?;

        // The type ID is calculated as the blake2b (with CKB's personalization) of
        // the first CellInput in current transaction, and the created output cell
        // index(in 64-bit little endian unsigned integer).
        let input = load_input(0, Source::Input)?;
        let mut blake2b = Blake2bBuilder::new(32)
            .personal(b"ckb-default-hash")
            .build();
        blake2b.update(input.as_slice());
        blake2b.update(&index.to_le_bytes());
        let mut ret = [0; 32];
        blake2b.finalize(&mut ret);

        if ret != type_id {
            debug!("Invalid type ID!");
            return Err(Error::Native(TypeIDError::TypeIDNotMatch));
        }
    }
    Ok(())
}

/// Loading type ID from current script args, type_id must be at least 32 byte
/// long.
pub fn load_type_id_from_script_args(offset: usize) -> Result<[u8; 32], Error> {
    let script = load_script()?;
    let args = script.as_reader().args();
    if offset + 32 > args.raw_data().len() {
        debug!("Length of type id is incorrect!");
        return Err(Error::Native(TypeIDError::ArgsLengthNotEnough));
    }
    let mut ret = [0; 32];
    ret.copy_from_slice(&args.raw_data()[offset..offset + 32]);
    Ok(ret)
}

pub fn program_entry() -> i8 {
    ckb_std::debug!("This is a sample contract!");

    0
}
