use alloc::string::{String, ToString};
use nostr::{Alphabet, Event, Tag};

const CELL_OUTPOINT_TAG_NAME: &str = "cell_outpoint";
const CELL_TYPE_ID_TAG_NAME: &str = "cell_type_id";

pub fn get_asset_event_cell_outpoint(event: Event) -> String {
    return get_first_custom_tag_value(event, CELL_OUTPOINT_TAG_NAME.to_string());
}

pub fn get_asset_event_cell_type_id(event: Event) -> String {
    return get_first_custom_tag_value(event, CELL_TYPE_ID_TAG_NAME.to_string());
}

pub fn get_asset_event_initial_owner(event: Event) -> String {
    return get_first_tag_value(event, Alphabet::P);
}

pub fn get_first_tag_value(event: Event, single_letter: Alphabet) -> String {
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
    panic!("first custom tag not found")
}
