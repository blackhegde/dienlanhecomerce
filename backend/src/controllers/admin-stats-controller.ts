// backend/src/controllers/admin-stats-controller.ts
// Provides timeseries (7-day quote counts) and GA4 analytics endpoints for admin dashboard.
import { Request, Response } from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import QuoteRequest from '../models/QuoteRequest';

// --- Helpers ---

/** Build an array of date strings ["YYYY-MM-DD", ...] for the last 7 days (today inclusive), UTC+7. */
function buildDateRange(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    // Shift to UTC+7 for display date
    const shifted = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = shifted.toISOString().slice(0, 10); // "YYYY-MM-DD"
    dates.push(dateStr);
  }
  return dates;
}

// --- Controllers ---

/**
 * GET /api/admin/stats/timeseries
 * Returns 7-day daily quote counts with zero-fill for missing days.
 */
export const getTimeseries = async (req: Request, res: Response): Promise<void> => {
  try {
    // Start of day 6 days ago in UTC+7, converted back to UTC for MongoDB query
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0 - 7, 0, 0, 0); // midnight UTC+7 → subtract 7h = 17:00 previous day UTC

    const [aggregated, distinctCustomers] = await Promise.all([
      QuoteRequest.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: '+07:00',
              },
            },
            quoteCount: { $sum: 1 },
            quotedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'quoted'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      QuoteRequest.distinct('customerName'),
    ]);

    // Build lookup map from aggregation results
    const resultMap = new Map<string, { quoteCount: number; quotedCount: number }>();
    for (const row of aggregated) {
      resultMap.set(row._id, { quoteCount: row.quoteCount, quotedCount: row.quotedCount });
    }

    // Zero-fill: ensure all 7 dates are present
    const dates = buildDateRange();
    const timeseries = dates.map((date) => ({
      date,
      quoteCount: resultMap.get(date)?.quoteCount ?? 0,
      quotedCount: resultMap.get(date)?.quotedCount ?? 0,
    }));

    res.json({
      success: true,
      timeseries,
      uniqueCustomers: distinctCustomers.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/admin/stats/ga4
 * Returns GA4 analytics data. Returns { available: false } when env vars are missing.
 */
export const getGa4Stats = async (req: Request, res: Response): Promise<void> => {
  // Graceful fallback when GA4 is not configured
  const hasJson = !!process.env.GA4_SERVICE_ACCOUNT_JSON;
  const hasFile = !!process.env.GA4_SERVICE_ACCOUNT_PATH;
  if (!process.env.GA4_PROPERTY_ID || (!hasJson && !hasFile)) {
    res.json({ success: true, ga4: { available: false } });
    return;
  }

  // Parse credentials — prefer JSON env var, fall back to file path
  let credentials: object | undefined;
  let serviceAccountEmail: string | undefined;
  try {
    const raw = hasJson
      ? process.env.GA4_SERVICE_ACCOUNT_JSON!
      : fs.readFileSync(process.env.GA4_SERVICE_ACCOUNT_PATH!, 'utf8');
    const parsed = JSON.parse(raw);
    credentials = parsed;
    serviceAccountEmail = parsed.client_email;
  } catch {
    res.json({ success: true, ga4: { available: false, error: 'Cannot parse GA4 service account credentials' } });
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      ...(hasJson ? { credentials } : { keyFile: process.env.GA4_SERVICE_ACCOUNT_PATH }),
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const propertyId = `properties/${process.env.GA4_PROPERTY_ID}`;

    // Run all 5 reports in parallel for performance
    const [reportA, reportB, reportC, reportD, reportE] = await Promise.all([
      // Report A: daily sessions + pageviews + users (7 days by date)
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
          ],
        },
      }),
      // Report B: top 5 overall pages by pageviews
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '5',
        },
      }),
      // Report C: traffic sources (channel groups)
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '6',
        },
      }),
      // Report D: device category breakdown
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        },
      }),
      // Report E: top product pages (/san-pham/*) by pageviews — GA4 as source of truth for product views
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [{ name: 'screenPageViews' }],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: { matchType: 'BEGINS_WITH', value: '/product/' },
            },
          },
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '8',
        },
      }),
    ]);

    // Parse Report A — daily sessions + pageviews + users; find today's row
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "YYYYMMDD"
    let sessionsToday = 0;
    let pageviewsToday = 0;
    let totalSessions7d = 0;
    let totalPageviews7d = 0;
    let totalUsers7d = 0;
    let newUsers7d = 0;
    const dailySessions: { date: string; sessions: number; pageviews: number }[] = [];

    for (const row of reportA.data.rows ?? []) {
      const date = row.dimensionValues?.[0]?.value ?? '';
      const sessions = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      const pageviews = parseInt(row.metricValues?.[1]?.value ?? '0', 10);
      const users = parseInt(row.metricValues?.[2]?.value ?? '0', 10);
      const newU = parseInt(row.metricValues?.[3]?.value ?? '0', 10);
      // GA4 returns dates as "YYYYMMDD"; convert to "YYYY-MM-DD" for display
      const displayDate = date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
      dailySessions.push({ date: displayDate, sessions, pageviews });
      totalSessions7d += sessions;
      totalPageviews7d += pageviews;
      totalUsers7d += users;
      newUsers7d += newU;
      if (date === todayStr) {
        sessionsToday = sessions;
        pageviewsToday = pageviews;
      }
    }

    // Parse Report B — top pages
    const topPages = (reportB.data.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? '',
      views: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    }));

    // Parse Report C — traffic sources
    const trafficSources = (reportC.data.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    }));

    // Parse Report D — device breakdown
    const deviceBreakdown = (reportD.data.rows ?? []).map((row) => ({
      device: row.dimensionValues?.[0]?.value ?? 'unknown',
      sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    }));

    // Parse Report E — top product pages from GA4 (last 30 days)
    const topProductPages = (reportE.data.rows ?? []).map((row) => {
      const path = row.dimensionValues?.[0]?.value ?? '';
      const title = row.dimensionValues?.[1]?.value ?? '';
      // Strip "/san-pham/" prefix and format slug as readable name
      const slug = path.replace(/^\/product\//, '').replace(/-/g, ' ');
      const name = title.split('|')[0].trim() || slug;
      return {
        path,
        name,
        views: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      };
    });

    res.json({
      success: true,
      ga4: {
        available: true,
        sessionsToday,
        pageviewsToday,
        totalSessions7d,
        totalPageviews7d,
        totalUsers7d,
        newUsers7d,
        dailySessions,
        topPages,
        trafficSources,
        deviceBreakdown,
        topProductPages,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'GA4 request failed';
    res.json({ success: true, ga4: { available: false, error: message, serviceAccountEmail } });
  }
};
