const { BigNumber } = require("ethers");

// const USDC = new Map();
// USDC.set("4", "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b");
// USDC.set("1337", "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b");
// USDC.set("1666700000", "0x289590A672C3Eb0AE9c952dBbf00E489f3F0B7b1"); // https://testnet.bridge.hmny.io/tokens

// const USDC_PRICE_FEED = new Map();
// USDC_PRICE_FEED.set("4", "0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB");
// USDC_PRICE_FEED.set("1337", "0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB");
// USDC_PRICE_FEED.set("1666700000", "0xa0ABAcC3162430b67Aa6C135dfAA08E117A38bF0"); // https://docs.chain.link/docs/harmony-price-feeds/
// USDC_PRICE_FEED.set("1666600000", "0xA45A41be2D8419B60A6CE2Bc393A0B086b8B3bda")

module.exports = async function ({
  getChainId,
  getNamedAccounts,
  deployments,
}) {
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  const Joetroller = await ethers.getContract("Joetroller");
  const unitroller = await ethers.getContract("Unitroller");
  const joetroller = Joetroller.attach(unitroller.address);

  const interestRateModel = await ethers.getContract("StableInterestRateModel");

  await deploy("JUsdcDelegate", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    contract: "JCollateralCapErc20Delegate",
  });
  const jUsdcDelegate = await ethers.getContract("JUsdcDelegate");
  const hasher = await ethers.getContract("Hasher");
  const verifier = await ethers.getContract("Verifier");
  const merkleTreeWithHistory = await ethers.getContract("MerkleTreeWithHistory");

  // let usdcAddress = USDC.get(chainId);

  // TODO: Adding this temporarily for testing.
  // if (chainId === '1337' || chainId === '1666900000') {
  const usdcDeployment = await deploy("USDC", {
    from: deployer,
    args: [
      "USD Coin",
      "USDC",
      6
    ],
    log: true,
    deterministicDeployment: false,
    contract: "ERC20",
  });
  const usdcAddress = usdcDeployment.address;

  const usdc = await ethers.getContract("USDC");
  await usdc.mint(deployer, ethers.utils.parseUnits("100000", 6));
  // }

  const deployment = await deploy("JUsdcDelegator", {
    from: deployer,
    args: [
      usdcAddress,
      joetroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("2", 14).toString(),
      ethers.utils.parseUnits("1000", 6).toString(), // default deposit
      "ZkJoe USD coin",
      "zkjUSDC",
      8,
      deployer,
      jUsdcDelegate.address,
      "0x",
      hasher.address,
      verifier.address,
      merkleTreeWithHistory.address
    ],
    log: true,
    deterministicDeployment: false,
    contract: "JCollateralCapErc20Delegator",
  });
  await deployment.receipt;
  const jUsdcDelegator = await ethers.getContract("JUsdcDelegator");

  console.log("Initializing merkle tree...");
  await merkleTreeWithHistory.initializeTree(jUsdcDelegator.address);

  console.log("Supporting zkjUSDC market...");
  await joetroller._supportMarket(jUsdcDelegator.address, 1, {
    gasLimit: 2000000,
  });

  // TODO: Adding this temporarily for testing.
  // if (chainId === '1337' || chainId === '1666900000') {
  const priceOracle = await ethers.getContract("MockOracle");
  console.log("Setting price feed source for zkjUSDC");
  await priceOracle._setUnderlyingPrice(
    jUsdcDelegator.address,
    BigNumber.from("100079980")
  );
  // } else {
  // const priceOracle = await ethers.getContract("PriceOracleProxyUSD");
  // console.log("Setting price feed source for zkjUSDC");
  // await priceOracle._setAggregators(
  //   [jUsdcDelegator.address],
  //   [USDC_PRICE_FEED.get(chainId)]
  // );
  // }

  const collateralFactor = "0.80";
  console.log("Setting collateral factor ", collateralFactor);
  await joetroller._setCollateralFactor(
    jUsdcDelegator.address,
    ethers.utils.parseEther(collateralFactor)
  );

  const reserveFactor = "0.15";
  console.log("Setting reserve factor ", reserveFactor);
  await jUsdcDelegator._setReserveFactor(
    ethers.utils.parseEther(reserveFactor)
  );
};

module.exports.tags = ["zkjUSDC"];
module.exports.dependencies = [
  "Joetroller",
  "TripleSlopeRateModel",
  "PriceOracle",
];
