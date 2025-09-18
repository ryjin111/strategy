export async function GET(request) {
  const url = new URL(request.url);
  const source = (url.searchParams.get('source') || 'opensea').toLowerCase();
  const slug = url.searchParams.get('slug');

  try {
    if (source === 'opensea') {
      if (!slug) {
        return new Response(JSON.stringify({ message: 'Missing required query param: slug' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const apiBase = process.env.OPENSEA_API_BASE || 'https://api.opensea.io';
      const endpoint = `${apiBase}/api/v2/collections/${encodeURIComponent(slug)}/stats`;
      const headers = {};
      if (process.env.OPENSEA_API_KEY) {
        headers['X-API-KEY'] = process.env.OPENSEA_API_KEY;
      }

      const res = await fetch(endpoint, { headers, next: { revalidate: 60 } });
      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ message: `OpenSea request failed (${res.status})`, detail: text }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
      const json = await res.json();

      const stats = json?.total || json?.stats || json; // accommodate slight shape variations
      const floorEth = Number(stats?.floor_price?.value || stats?.floor_price || 0);
      const oneDayVolume = Number(stats?.one_day_volume || stats?.intervals?.one_day?.volume || 0);
      const oneDaySales = Number(stats?.one_day_sales || stats?.intervals?.one_day?.sales || 0);
      const sevenDayVolume = Number(stats?.seven_day_volume || stats?.intervals?.seven_day?.volume || 0);
      const sevenDaySales = Number(stats?.seven_day_sales || stats?.intervals?.seven_day?.sales || 0);
      const listedCount = Number(stats?.listed_count || stats?.listings || 0);

      return Response.json({
        source: 'opensea',
        slug,
        stats: {
          floorEth,
          listedCount,
          oneDayVolume,
          oneDaySales,
          sevenDayVolume,
          sevenDaySales,
        },
        raw: json,
      });
    }

    if (source === 'shape') {
      // Placeholder for Shape MCP integration.
      // In a full integration, this would call into a local MCP client or a proxy service
      // to execute onchain tools and fetch collection analytics on Shape Chain.
      return new Response(
        JSON.stringify({
          message: 'Shape MCP analytics not yet implemented in this app. See the Shape MCP client demo repository for integration patterns.',
          reference: 'https://github.com/shape-network/mcp-client-demo',
        }),
        { status: 501, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ message: `Unknown source: ${source}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Failed to fetch analytics', error: String(error?.message || error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 