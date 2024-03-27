use super::*;
use ckb_testtool::{
    builtin::ALWAYS_SUCCESS,
    ckb_hash::Blake2bBuilder,
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*},
    context::Context,
};
use nostr::prelude::*;

extern crate hex;
use hex::encode;

const MAX_CYCLES: u64 = 10_000_000;
const _ASSET_META_KIND: u16 = 23332;
const ASSET_MINT_KIND: u16 = 23333;
const ASSET_CONSUME_KIND: u16 = 23334;

#[test]
fn test_mint_token() {
    // deploy contract
    let mut context = Context::default();
    let loader = Loader::default();
    let nostr_binding_bin = loader.load_binary("nostr-binding");
    let auth_bin = loader.load_binary("../../deps/auth");
    let nostr_binding_out_point = context.deploy_cell(nostr_binding_bin);
    let auth_out_point: OutPoint = context.deploy_cell(auth_bin);

    // pass secret key
    let my_keys =
        Keys::parse("a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba").unwrap();

    // prepare scripts
    let always_success_out_point = context.deploy_cell(ALWAYS_SUCCESS.clone());
    let lock_script = context
        .build_script(&always_success_out_point.clone(), Default::default())
        .expect("script");
    let lock_script_dep = CellDep::new_builder()
        .out_point(always_success_out_point)
        .build();

    // prepare cell deps
    let nostr_binding_dep = CellDep::new_builder()
        .out_point(nostr_binding_out_point.clone())
        .build();
    let auth_dep = CellDep::new_builder().out_point(auth_out_point).build();
    let cell_deps = vec![nostr_binding_dep, auth_dep, lock_script_dep].pack();

    // prepare cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let type_id = {
        let mut blake2b = Blake2bBuilder::new(32)
            .personal(b"ckb-default-hash")
            .build();
        blake2b.update(input.as_slice());
        blake2b.update(&0u64.to_le_bytes());
        let mut ret = [0; 32];
        blake2b.finalize(&mut ret);
        Bytes::from(ret.to_vec())
    };
    // build nostr asset event
    let tags = [
        Tag::Generic(
            TagKind::from("cell_type_id"),
            vec![encode(type_id.clone().to_vec())],
        ),
        Tag::public_key(my_keys.public_key()),
    ];
    let event: Event = EventBuilder::new(Kind::from(ASSET_MINT_KIND as u64), "", tags)
        .to_event(&my_keys)
        .unwrap();
    let event_id = event.id().to_bytes();

    let mut type_script_args: [u8; 64] = [0u8; 64];
    type_script_args[..32].copy_from_slice(&event_id);
    type_script_args[32..].copy_from_slice(&type_id);

    let type_script = context
        .build_script(&nostr_binding_out_point, type_script_args.to_vec().into())
        .expect("script");

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .type_(Some(type_script.clone()).pack())
            .build(),
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script)
            .build(),
    ];

    // prepare output cell data
    let owner_pubkey: Bytes = {
        let k = my_keys.public_key().to_bytes();
        Bytes::from(k.to_vec())
    };
    let outputs_data = vec![owner_pubkey, Bytes::new()];

    // build transaction
    let tx = TransactionBuilder::default()
        .cell_deps(cell_deps)
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();

    // sign and add witness
    let witness_builder = WitnessArgs::new_builder();
    let zero_lock: Bytes = {
        let mut buf = Vec::new();
        buf.resize(65, 0);
        buf.into()
    };
    let nostr_witness: Bytes = {
        let buf = event.as_json().as_bytes().to_vec();
        buf.into()
    };
    let witness = witness_builder
        .lock(Some(zero_lock).pack())
        .output_type(Some(nostr_witness).pack())
        .build();

    let tx = tx
        .as_advanced_builder()
        .witness(witness.as_bytes().pack())
        .build();

    // run
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_transfer_token() {
    // deploy contract
    let mut context = Context::default();
    let loader = Loader::default();
    let nostr_binding_bin = loader.load_binary("nostr-binding");
    let auth_bin = loader.load_binary("../../deps/auth");
    let nostr_binding_out_point = context.deploy_cell(nostr_binding_bin);
    let auth_out_point: OutPoint = context.deploy_cell(auth_bin);

    // pass secret key
    let my_keys =
        Keys::parse("a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba").unwrap();

    // prepare scripts
    let always_success_out_point = context.deploy_cell(ALWAYS_SUCCESS.clone());
    let lock_script = context
        .build_script(&always_success_out_point.clone(), Default::default())
        .expect("script");
    let lock_script_dep = CellDep::new_builder()
        .out_point(always_success_out_point)
        .build();

    // prepare cell deps
    let nostr_binding_dep = CellDep::new_builder()
        .out_point(nostr_binding_out_point.clone())
        .build();
    let auth_dep = CellDep::new_builder().out_point(auth_out_point).build();
    let cell_deps = vec![nostr_binding_dep, auth_dep, lock_script_dep].pack();

    // prepare asset binding cell
    let origin_input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let origin_input = CellInput::new_builder()
        .previous_output(origin_input_out_point.clone())
        .build();
    let type_id = {
        let mut blake2b = Blake2bBuilder::new(32)
            .personal(b"ckb-default-hash")
            .build();
        blake2b.update(origin_input.as_slice());
        blake2b.update(&0u64.to_le_bytes());
        let mut ret = [0; 32];
        blake2b.finalize(&mut ret);
        Bytes::from(ret.to_vec())
    };
    let event_id: [u8; 32] = [2u8; 32]; // makeup a asset event id to be consumed

    let mut type_script_args: [u8; 64] = [0u8; 64];
    type_script_args[..32].copy_from_slice(&event_id);
    type_script_args[32..].copy_from_slice(&type_id);

    let type_script = context
        .build_script(&nostr_binding_out_point, type_script_args.to_vec().into())
        .expect("script");

    let owner_pubkey: Bytes = {
        let k = my_keys.public_key().to_bytes();
        Bytes::from(k.to_vec())
    };

    // prepare input cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .type_(Some(type_script.clone()).pack())
            .build(),
        owner_pubkey.clone(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    // build nostr asset event

    let cell_outpoint_tag = {
        let outpoint_tx_hash_hex = encode(input_out_point.tx_hash().as_bytes().to_vec());
        let outpoint_index_hex = encode(input_out_point.index().as_bytes().to_vec());
        outpoint_tx_hash_hex.to_string() + ":" + &outpoint_index_hex
    };
    let tags = [
        Tag::Generic(TagKind::from("cell_outpoint"), vec![cell_outpoint_tag]),
        Tag::public_key(my_keys.public_key()),
    ];
    let event: Event = EventBuilder::new(Kind::from(ASSET_CONSUME_KIND as u64), "", tags)
        .to_event(&my_keys)
        .unwrap();

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .type_(Some(type_script.clone()).pack())
            .build(),
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script)
            .build(),
    ];

    // prepare output data
    let outputs_data = vec![owner_pubkey, Bytes::new()];

    // build transaction
    let tx = TransactionBuilder::default()
        .cell_deps(cell_deps)
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();

    // sign and add witness
    let witness_builder = WitnessArgs::new_builder();
    let zero_lock: Bytes = {
        let mut buf = Vec::new();
        buf.resize(65, 0);
        buf.into()
    };
    let nostr_witness: Bytes = {
        let buf = event.as_json().as_bytes().to_vec();
        buf.into()
    };
    let witness = witness_builder
        .lock(Some(zero_lock).pack())
        .output_type(Some(nostr_witness).pack())
        .build();

    let tx = tx
        .as_advanced_builder()
        .witness(witness.as_bytes().pack())
        .build();

    // run
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
