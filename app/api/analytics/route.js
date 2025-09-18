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
      const address = (url.searchParams.get('address') || '').trim().toLowerCase();
      if (!/^0x[a-f0-9]{40}$/.test(address)) {
        return new Response(JSON.stringify({ message: 'Missing or invalid address for Shape analytics' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let shapeResult = null;
      let floorEth = 0;

      // Primary: user-provided analytics endpoint
      const shapeAnalyticsBase = process.env.SHAPE_ANALYTICS_URL;
      if (shapeAnalyticsBase) {
        try {
          const endpoint = `${shapeAnalyticsBase.replace(/\/$/, '')}/analytics?address=${address}`;
          const res = await fetch(endpoint, { next: { revalidate: 60 } });
          if (res.ok) {
            const data = await res.json();
            shapeResult = data;
            floorEth = Number(data?.stats?.floorEth || data?.floorEth || 0) || 0;
            if (floorEth > 0) {
              const listedCount = Number(data?.stats?.listedCount || data?.listedCount || 0);
              const oneDayVolume = Number(data?.stats?.oneDayVolume || data?.oneDayVolume || 0);
              const oneDaySales = Number(data?.stats?.oneDaySales || data?.oneDaySales || 0);
              const sevenDayVolume = Number(data?.stats?.sevenDayVolume || data?.sevenDayVolume || 0);
              const sevenDaySales = Number(data?.stats?.sevenDaySales || data?.sevenDaySales || 0);
              return Response.json({ source: 'shape', address, stats: { floorEth, listedCount, oneDayVolume, oneDaySales, sevenDayVolume, sevenDaySales }, raw: data });
            }
          }
        } catch {}
      }

      // Secondary: MCP bridge endpoint if provided
      if (floorEth <= 0) {
        const mcpBase = process.env.SHAPE_MCP_BASE;
        if (mcpBase) {
          try {
            const endpoint = `${mcpBase.replace(/\/$/, '')}/analytics/floor?address=${address}`;
            const res = await fetch(endpoint, { next: { revalidate: 60 } });
            if (res.ok) {
              const data = await res.json();
              shapeResult = data;
              floorEth = Number(data?.floorEth || data?.stats?.floorEth || 0) || 0;
              if (floorEth > 0) {
                return Response.json({ source: 'shape', address, stats: { floorEth }, raw: data });
              }
            }
          } catch {}
        }
      }

      // Fallback to OpenSea if shape floor is zero
      if (floorEth <= 0) {
        const fallbackChain = process.env.OPENSEA_FALLBACK_CHAIN || 'ethereum';
        const base = new URL(request.url);
        const resolveUrl = new URL(`/api/resolve-collection?address=${address}&chain=${encodeURIComponent(fallbackChain)}`, base.origin);
        try {
          const res = await fetch(resolveUrl.href, { next: { revalidate: 60 } });
          const json = await res.json();
          const osFloor = Number(json?.floorEth || json?.stats?.floorEth || 0) || 0;
          if (osFloor > 0) {
            return Response.json({ source: 'opensea-fallback', address, slug: json.slug || null, chain: fallbackChain, stats: { floorEth: osFloor }, raw: { shape: shapeResult, opensea: json } });
          }
        } catch {}
      }

      // If still nothing, return not configured/zero
      if (!shapeResult && !shapeAnalyticsBase && !process.env.SHAPE_MCP_BASE) {
        return new Response(JSON.stringify({ message: 'Shape analytics not configured. Set SHAPE_ANALYTICS_URL or SHAPE_MCP_BASE.' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
      }
      return Response.json({ source: 'shape', address, stats: { floorEth: floorEth || 0 }, raw: shapeResult });
    }

    return new Response(JSON.stringify({ message: `Unknown source: ${source}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Failed to fetch analytics', error: String(error?.message || error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 