use ckb_std::error::SysError;

#[cfg(test)]
extern crate alloc;

#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    // [Auth]
    // Add customized errors here...
    AuthFail,
    // [type_id]
    // There can only be at most one input and at most one output type ID cell
    InvalidTypeIDCellNum,
    // Type id does not match args
    TypeIDNotMatch,
    // Length of type id is incorrect
    ArgsLengthNotEnough,
    // [nostr]
    AssetEventIdNotMatch,
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
