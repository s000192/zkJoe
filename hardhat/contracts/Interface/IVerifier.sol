pragma solidity ^0.5.16;

interface IVerifier {
  function verifyProof(
      uint[2] calldata a,
      uint[2][2] calldata b,
      uint[2] calldata c,
      uint[2] calldata input
  ) external view returns (bool r);
}