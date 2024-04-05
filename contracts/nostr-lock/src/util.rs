use alloc::string::{String, ToString};
use ckb_std::debug;
use nostr::{Alphabet, Event, Tag};

use crate::config::CKB_TX_HASH_TAG_NAME;

pub fn get_event_ckb_tx_hash(event: Event) -> String {
    get_first_custom_tag_value(event, CKB_TX_HASH_TAG_NAME.to_string())
}

pub fn _get_first_tag_value(event: Event, single_letter: Alphabet) -> String {
    let tags = event.tags();
    for tag in tags.iter() {
        let res = Tag::parse(tag.as_vec());
        if res.is_ok() {
            let tag = res.unwrap();
            let single_tag = tag.single_letter_tag();
            if single_tag.is_some() {
                let single_tag = single_tag.unwrap();
                if single_tag.character.eq(&single_letter) {
                    let value = tag.content().unwrap();
                    let onwer_pubkey = value.to_string();
                    return onwer_pubkey;
                }
            }
        }
    }
    panic!("owner pubkey not found")
}

pub fn get_first_custom_tag_value(event: Event, tag_name: String) -> String {
    let tags = event.tags();
    for tag in tags.iter() {
        let res = Tag::parse(tag.as_vec());
        if res.is_ok() {
            let tag = res.unwrap();
            let tag_vec = tag.as_vec();
            let name = tag_vec.first().unwrap();

            if name.eq(&tag_name) {
                let value = &tag_vec[1];
                return value.to_string();
            }
        }
    }
    debug!("first custom tag not found, {:?}", tag_name);
    panic!("first custom tag not found")
}
