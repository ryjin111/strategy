import { createPublicClient, http, getContract, formatUnits } from 'viem';

const ERC20_ABI = [
  { "type": "function", "name": "name", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "string" }] },
  { "type": "function", "name": "symbol", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "string" }] },
  { "type": "function", "name": "decimals", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint8" }] },
  { "type": "function", "name": "totalSupply", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "owner", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
];

function getRpc(chain) {
  if (chain === 'shape') {
    return process.env.SHAPE_RPC_URL || 'https://rpc.shape.network';
  }
  if (chain === 'ethereum') {
    return process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
  }
  return process.env.SHAPE_RPC_URL || 'https://rpc.shape.network';
}

export async function GET(request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get('address') || '').trim();
  const chain = (url.searchParams.get('chain') || 'shape').toLowerCase();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return new Response(JSON.stringify({ message: 'Invalid address' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const rpcUrl = getRpc(chain);
    const client = createPublicClient({ transport: http(rpcUrl) });
    const token = getContract({ address, abi: ERC20_ABI, client });

    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      token.read.name().catch(() => null),
      token.read.symbol().catch(() => null),
      token.read.decimals().catch(() => 18),
      token.read.totalSupply().catch(() => 0n),
      token.read.owner?.().catch?.(() => null) || Promise.resolve(null),
    ]);

    const supplyFormatted = typeof decimals === 'number' ? formatUnits(totalSupply || 0n, decimals) : null;

    return Response.json({
      chain,
      address,
      rpcUrl,
      name,
      symbol,
      decimals,
      totalSupply: totalSupply?.toString?.() || '0',
      totalSupplyFormatted: supplyFormatted,
      owner,
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Failed to read token', error: String(e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 