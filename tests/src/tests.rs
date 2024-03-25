use super::*;
use ckb_testtool::{
    ckb_hash::blake2b_256,
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*},
    context::Context,
};
use nostr::prelude::*;

const MAX_CYCLES: u64 = 10_000_000;

#[test]
fn test_funding_lock() {
    // deploy contract
    let mut context = Context::default();
    let loader = Loader::default();
    let funding_lock_bin = loader.load_binary("funding-lock");
    let auth_bin = loader.load_binary("../../deps/auth");
    let funding_lock_out_point = context.deploy_cell(funding_lock_bin);
    let auth_out_point: OutPoint = context.deploy_cell(auth_bin);

    // generate two random secret keys
    let my_keys =
        Keys::parse("a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba").unwrap();
    let x_only_pub_key = my_keys.public_key().to_bytes();

    // prepare scripts
    let pub_key_hash = blake2b_256(x_only_pub_key);
    let lock_script = context
        .build_script(&funding_lock_out_point, pub_key_hash[0..20].to_vec().into())
        .expect("script");

    // prepare cell deps
    let funding_lock_dep = CellDep::new_builder()
        .out_point(funding_lock_out_point)
        .build();
    let auth_dep = CellDep::new_builder().out_point(auth_out_point).build();
    let cell_deps = vec![funding_lock_dep, auth_dep].pack();

    // prepare cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script)
            .build(),
    ];

    let outputs_data = vec![Bytes::new(); 2];

    // build transaction
    let tx = TransactionBuilder::default()
        .cell_deps(cell_deps)
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();

    // sign and add witness

    // New text note
    let event: Event = EventBuilder::text_note("Hello from Nostr SDK", [])
        .to_event(&my_keys)
        .unwrap();

    let witness = event.as_json().as_bytes().to_vec();

    let tx = tx.as_advanced_builder().witness(witness.pack()).build();

    println!("tx: {:?}", tx);

    // run
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
