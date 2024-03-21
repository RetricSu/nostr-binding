use super::*;
use ckb_testtool::{
    ckb_hash::blake2b_256,
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*},
    context::Context,
};
use musig2::{
    BinaryEncoding, CompactSignature, FirstRound, KeyAggContext, PartialSignature, SecNonceSpices,
};
use secp256k1::{
    rand::{self, RngCore},
    PublicKey, Secp256k1, SecretKey,
};

const MAX_CYCLES: u64 = 10_000_000;

#[test]
fn test_funding_lock() {
    // deploy contract
    let mut context = Context::default();
    let loader = Loader::default();
    let funding_lock_bin = loader.load_binary("funding-lock");
    let auth_bin = loader.load_binary("../../deps/auth");
    let funding_lock_out_point = context.deploy_cell(funding_lock_bin);
    let auth_out_point = context.deploy_cell(auth_bin);

    // generate two random secret keys
    let sec_key_1 = SecretKey::new(&mut rand::thread_rng());
    let sec_key_2 = SecretKey::new(&mut rand::thread_rng());

    // public key aggregation
    let secp256k1 = Secp256k1::new();
    let pub_key_1 = sec_key_1.public_key(&secp256k1);
    let pub_key_2 = sec_key_2.public_key(&secp256k1);
    let key_agg_ctx = KeyAggContext::new(vec![pub_key_1, pub_key_2]).unwrap();
    let aggregated_pub_key: PublicKey = key_agg_ctx.aggregated_pubkey();
    let x_only_pub_key = aggregated_pub_key.x_only_public_key().0.serialize();

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
    let message: [u8; 32] = tx.hash().as_slice().try_into().unwrap();

    let mut first_round_1 = {
        let mut nonce_seed = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut nonce_seed);

        FirstRound::new(
            key_agg_ctx.clone(),
            nonce_seed,
            0,
            SecNonceSpices::new()
                .with_seckey(sec_key_1)
                .with_message(&message),
        )
        .unwrap()
    };

    let mut first_round_2 = {
        let mut nonce_seed = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut nonce_seed);

        FirstRound::new(
            key_agg_ctx,
            nonce_seed,
            1,
            SecNonceSpices::new()
                .with_seckey(sec_key_2)
                .with_message(&message),
        )
        .unwrap()
    };

    first_round_1
        .receive_nonce(1, first_round_2.our_public_nonce())
        .unwrap();
    first_round_2
        .receive_nonce(0, first_round_1.our_public_nonce())
        .unwrap();

    let mut second_round_1 = first_round_1.finalize(sec_key_1, message).unwrap();
    let mut second_round_2 = first_round_2.finalize(sec_key_2, message).unwrap();
    let signature_1: PartialSignature = second_round_1.our_signature();
    let signature_2: PartialSignature = second_round_2.our_signature();

    second_round_1.receive_signature(1, signature_2).unwrap();
    let aggregated_signature_1: CompactSignature = second_round_1.finalize().unwrap();
    second_round_2.receive_signature(0, signature_1).unwrap();
    let aggregated_signature_2: CompactSignature = second_round_2.finalize().unwrap();

    assert_eq!(aggregated_signature_1, aggregated_signature_2);
    println!("signature: {:?}", aggregated_signature_1.to_bytes());

    let witness = [
        &x_only_pub_key,
        aggregated_signature_1.to_bytes().as_slice(),
    ]
    .concat();

    let tx = tx.as_advanced_builder().witness(witness.pack()).build();

    println!("tx: {:?}", tx);

    // run
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
