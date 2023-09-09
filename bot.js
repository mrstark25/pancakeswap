const ethers = require("ethers");

const addresses = {
  WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // BSC Testnet WBNB
  router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // Pancakeswap Router address on BSC testnet
  factory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17", // Pancake Factrory address on bSC testnet
  me: "0x175155857D3a260B51797EAd981e95459441056E",
};

const mnemonic =
  "pill roof torch layer play arrest property duck stuff drive taste farm";

const provider = new ethers.providers.WebSocketProvider(
  "wss://damp-responsive-liquid.bsc-testnet.discover.quiknode.pro/6cece23bc5e3dceecde79f94b6f33590aa576490/"
);
const wallet = ethers.Wallet.fromMnemonic(mnemonic);
const account = wallet.connect(provider);

// Listens for newly created pair
const factory = new ethers.Contract(
  addresses.factory,
  [
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
  ],
  account
);

//Use our WBNB to buy some amount of the new token
const router = new ethers.Contract(
  addresses.router,
  [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)",
  ],
  account
);

factory.on("PairCreated", async (token0, token1, addressPair) => {
  console.log(`
    -----------------
    New pair detected
    -----------------
    token0: ${token0}
    token1: ${token1}
    addressPair: ${addressPair}
    `);

  // This block ensures we pay with WBNB
  let buyToken, sellToken;
  if (token0 === addresses.WBNB) {
    buyToken = token0;
    sellToken = token1;
  }
  if (token1 === addresses.WBNB) {
    buyToken = token1;
    sellToken = token0;
  }
  // Neither token is WBNB and we cannot purchase
  if (typeof buyToken === "undefined") {
    return;
  }
  const amountIn = ethers.utils.parseUnits("0.1", "ether"); //ether is the measurement, not the coin
  const amounts = await router.getAmountsOut(amountIn, [buyToken, sellToken]);

  const amountOutMin = amounts[1].sub(amounts[1].div(10)); // math for Big numbers in JS
  console.log(`
    -----------------
    Buying new token
    -----------------
    buyToken: ${amountIn.toString()} ${buyToken} (WBNB)
    sellToken: ${amountOutMin.toString()} ${sellToken}
    `);
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [buyToken, sellToken],
    addresses.me,
    Date.now() + 1000 * 60 * 5 //5 minutes
  );
  const receipt = await tx.wait();
  console.log("Transaction receipt");
  console.log(receipt);
});
