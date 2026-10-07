import type { SystemDesignModel } from '../../types'

export const GEOSPATIAL_AND_SEARCH_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'uber-dispatch',
    name: 'Real-Time Geospatial Ride Dispatch (Uber / Lyft)',
    category: 'Geospatial & Search',
    difficulty: 'Expert',
    tagline: 'Real-time driver location tracking and supply-demand matching utilizing the Uber H3 hexagonal spatial index, Redis Geospatial, and WebSocket streaming.',
    throughput: '1,000,000 driver GPS pings/sec · 50,000 ride dispatches/min',
    latency: 'Driver location refresh < 3 sec · Match calculation < 1 sec',
    storageScale: 'Real-time in-memory spatial indices across thousands of cities',
    overview:
      'A real-time geospatial location and ride dispatch engine. Ingests GPS telemetry pings every 4 seconds from millions of active drivers over persistent WebSockets. Maps coordinates to the Uber H3 hexagonal spatial hierarchy (Resolution 7-9) to execute sub-millisecond nearest-neighbor driver searches and dynamic surge pricing calculations.',
    functionalReqs: [
      'Real-time GPS location ingestion from active drivers every 4 seconds.',
      'Nearby driver search: Given rider lat/long, return 10 closest available drivers within 3 km.',
      'Ride matching & dispatch: Match rider with optimal driver based on ETA, rating, and route efficiency.',
      'Dynamic surge pricing: Compute supply/demand ratio across H3 hexagonal cells every 10 seconds.',
    ],
    nonFunctionalReqs: [
      'Sub-second match dispatch response.',
      'Zero lost location pings for actively engaged trips.',
      'Resilient to rapid city-level network drops.',
    ],
    calculations: [
      {
        metric: 'Driver Ingestion Bandwidth',
        formula: '1M active drivers * 1 ping / 4 sec = 250,000 GPS pings/sec',
        result: '250,000 writes/sec to location store',
      },
      {
        metric: 'H3 Hexagon Equidistance Advantage',
        formula: 'Hexagonal neighbor distance = 1.0 (Uniform in all 6 directions)',
        result: 'Eliminates diagonal distortion of square grids (where diagonal = √2 ≈ 1.414)',
      },
      {
        metric: 'H3 Resolution 8 Cell Area',
        formula: 'Average area = 0.737 km² · Edge length = 461 meters',
        result: 'Ideal granularity for urban neighborhood ride search',
      },
    ],
    services: [
      { id: 'driver-app', name: 'Driver Mobile App', role: 'Sends GPS lat/lon every 4 seconds', type: 'client', x: 10, y: 30, icon: 'Navigation', techStack: 'iOS / Android Native', details: 'Sends {driverId, lat, lon, heading, status}' },
      { id: 'rider-app', name: 'Rider Mobile App', role: 'Requests ride pickup', type: 'client', x: 10, y: 70, icon: 'User', techStack: 'iOS / Android Native', details: 'Sends POST /v1/rides/request {pickupLat, pickupLon}' },
      { id: 'ws-gateway', name: 'Location WebSocket Gateway', role: 'Maintains open TCP sockets with drivers', type: 'gateway', x: 35, y: 30, icon: 'Radio', techStack: 'Go / Netty Gateway', details: 'Ingests 250k pings/sec; parses H3 hex cell' },
      { id: 'geo-cache', name: 'Redis Geospatial / H3 Index', role: 'In-memory spatial index of available drivers', type: 'cache', x: 60, y: 30, icon: 'Compass', techStack: 'Redis Cluster / H3 In-Memory', details: 'Key: h3_cell_res8 -> Set of available driver IDs' },
      { id: 'dispatch-engine', name: 'Dispatch & Matching Engine', role: 'Matches rider with optimal driver', type: 'service', x: 60, y: 70, icon: 'Cpu', techStack: 'Go / C++ Matching Core', details: 'Executes k-ring search around rider cell; dispatches offer' },
      { id: 'trip-db', name: 'Trip Database (Postgres)', role: 'Durable trip and billing records', type: 'database', x: 88, y: 70, icon: 'Database', techStack: 'PostgreSQL / CockroachDB', details: 'Stores permanent trip status, route, and invoice' },
    ],
    connections: [
      { id: 'c1', from: 'driver-app', to: 'ws-gateway', label: 'WebSocket GPS Ping (every 4s)', protocol: 'WebSocket' },
      { id: 'c2', from: 'ws-gateway', to: 'geo-cache', label: 'Update Driver H3 Cell', protocol: 'Redis' },
      { id: 'c3', from: 'rider-app', to: 'dispatch-engine', label: 'POST /v1/rides/request', protocol: 'HTTPS' },
      { id: 'c4', from: 'dispatch-engine', to: 'geo-cache', label: 'Find Drivers in H3 Cell + Neighbors', protocol: 'Redis' },
      { id: 'c5', from: 'dispatch-engine', to: 'trip-db', label: 'Create Trip Record', protocol: 'SQL' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Driver Emits Real-Time GPS Telemetry',
        description: 'Driver Dave\'s phone transmits GPS coordinates (37.7749° N, 122.4194° W) over WebSocket to Gateway.',
        fromNode: 'driver-app',
        toNode: 'ws-gateway',
        protocol: 'WebSocket',
        payload: { driverId: 'drv_8923', lat: 37.7749, lon: -122.4194, heading: 180, status: 'AVAILABLE' },
        codeRef: { file: 'h3_dispatch.go', lineHighlight: '15-28', funcName: 'HandleLocationPing', codeExplanation: 'Converts lat/lon to H3 index at resolution 8; updates driver coordinate in Redis.' },
        stateChange: 'Driver location indexed in H3 cell 8828308281fffff.',
      },
      {
        step: 2,
        title: 'Step 2: Rider Requests Pickup',
        description: 'Rider Rachel clicks "Confirm UberX" in Downtown SF. Request arrives at Dispatch Engine.',
        fromNode: 'rider-app',
        toNode: 'dispatch-engine',
        protocol: 'HTTPS',
        payload: { riderId: 'rdr_1294', pickupLat: 37.7752, pickupLon: -122.4190, rideTier: 'UBERX' },
        codeRef: { file: 'h3_dispatch.go', lineHighlight: '32-48', funcName: 'FindNearbyDrivers', codeExplanation: 'Calculates rider H3 cell; queries k-ring(1) (rider cell + 6 adjacent hexagons).' },
        stateChange: 'Dispatch Engine initiates spatial neighborhood search.',
      },
      {
        step: 3,
        title: 'Step 3: Hexagonal K-Ring Neighbor Search',
        description: 'Dispatch Engine queries Redis for driver IDs resting in the rider\'s H3 cell and all 6 adjacent neighboring hexagons.',
        fromNode: 'dispatch-engine',
        toNode: 'geo-cache',
        protocol: 'Redis',
        payload: { h3Center: '8828308281fffff', kRingRadius: 1, foundDriverIds: ['drv_8923', 'drv_9011'] },
        codeRef: { file: 'h3_dispatch.go', lineHighlight: '50-65', funcName: 'DispatchOffer', codeExplanation: 'Selects Driver Dave (ETA 2.1 mins); emits ride offer with 15-second acceptance timer.' },
        stateChange: 'Offer sent to Driver Dave\'s phone; trip confirmed upon accept.',
      },
    ],
    codeFiles: [
      {
        name: 'h3_dispatch.go',
        language: 'go',
        role: 'Uber H3 Hexagonal Spatial Indexing & Dispatch Search',
        code: `package dispatch

import (
	"context"
	"github.com/uber/h3-go/v3"
	"github.com/go-redis/redis/v8"
)

type DispatchEngine struct {
	rdb *redis.Client
}

// ConvertLatLonToH3 converts coordinates to resolution 8 hexagon (radius ~460m)
func ConvertLatLonToH3(lat, lon float64) h3.Index {
	coord := h3.GeoCoord{Latitude: lat, Longitude: lon}
	return h3.FromGeo(coord, 8)
}

// FindNearbyDrivers searches rider cell + all 6 equidistant hexagonal neighbors
func (d *DispatchEngine) FindNearbyDrivers(ctx context.Context, riderLat, riderLon float64) ([]string, error) {
	riderCell := ConvertLatLonToH3(riderLat, riderLon)
	
	// k-ring 1 returns center hexagon + 6 surrounding neighbors (7 hexagons total)
	searchCells := h3.KRing(riderCell, 1)

	var driverIds []string
	for _, cell := range searchCells {
		cellKey := "drivers:h3:" + cell.String()
		ids, err := d.rdb.SMembers(ctx, cellKey).Result()
		if err == nil {
			driverIds = append(driverIds, ids...)
		}
	}

	return driverIds, nil
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Uber replaced traditional latitude/longitude bounding boxes with the H3 Hexagonal Hierarchical Spatial Index. Hexagons possess the crucial invariant that all 6 adjacent neighbors are exactly equidistant, preventing the corner distance distortions of square Cartesian grids. Redis stores sets of active driver IDs per H3 cell, enabling sub-millisecond proximity matching.',
      databaseSchema: 'Redis: Set drivers:h3:{hex_index} -> driver_id. Postgres: trips (id UUID, rider_id UUID, driver_id UUID, pickup_lat DOUBLE, dropoff_lat DOUBLE, status VARCHAR).',
      apiEndpoints: [
        { method: 'POST', path: '/v1/rides/request', desc: 'Requests ride match' },
        { method: 'WS', path: '/v1/drivers/telemetry', desc: 'Driver GPS stream socket' },
      ],
      bottlenecksAndTradeoffs: [
        'Surge Pricing Calculation Overhead: Recomputing surge pricing globally on every ping is computationally prohibitive. Cities are discretized into H3 resolution 7 cells, and a background Apache Flink job calculates supply/demand ratios every 10 seconds per cell.',
      ],
    },
  },
  {
    id: 'web-crawler',
    name: 'Distributed Web Crawler (Googlebot)',
    category: 'Geospatial & Search',
    difficulty: 'Advanced',
    tagline: 'High-throughput distributed web crawler featuring URL Frontier priority queues, Robots.txt politeness delays, and MurmurHash content deduplication.',
    throughput: '10,000 pages downloaded & parsed/sec',
    latency: 'Strict 1-second politeness delay per domain host',
    storageScale: 'Billions of web pages and petabytes of parsed text',
    overview:
      'A distributed web crawling system designed to crawl billions of web pages across the public internet. Solves crawler traps and network congestion through an intelligent two-tier URL Frontier (Priority Queue + Politeness Queue) and enforces domain-level rate limits respecting robots.txt guidelines.',
    functionalReqs: [
      'Crawl billions of web pages starting from seed URLs.',
      'Politeness: Never overload a single web server (strictly respect robots.txt and host delay).',
      'Deduplication: Do not crawl or index duplicate content using SimHash / MurmurHash.',
      'Scalable parser pool extracting hyperlinks, text, and metadata.',
    ],
    nonFunctionalReqs: [
      'High throughput: Process tens of thousands of pages per second.',
      'Extensibility: Support HTML, PDF, image, and XML document formats.',
    ],
    calculations: [
      {
        metric: 'Monthly Crawl Volume',
        formula: '1B pages / month = 1B / (30 * 86,400) ≈ 385 pages/sec (Peak: 10,000 pages/sec)',
        result: '10,000 pages/sec ingestion throughput',
      },
      {
        metric: 'Raw Storage Volume',
        formula: '1B pages * 100 KB avg HTML size = 100 Terabytes / month',
        result: '1.2 Petabytes / year raw storage',
      },
    ],
    services: [
      { id: 'url-frontier', name: 'URL Frontier', role: 'Manages priority & politeness queues', type: 'queue', x: 20, y: 50, icon: 'List', techStack: 'Kafka / Redis', details: 'Separates URLs by domain into politeness queues' },
      { id: 'dns-resolver', name: 'High-Speed DNS Resolver', role: 'Caches IP addresses of domains', type: 'service', x: 45, y: 25, icon: 'Globe', techStack: 'Unbound DNS Cache', details: 'Eliminates DNS lookup latency bottlenecks' },
      { id: 'downloader', name: 'HTML Fetcher Workers', role: 'Downloads web pages over HTTP', type: 'worker', x: 45, y: 75, icon: 'Download', techStack: 'Go / libcurl Workers', details: 'Enforces robots.txt delay per host' },
      { id: 'content-dedup', name: 'Deduplication Engine', role: 'Detects duplicate pages via SimHash', type: 'service', x: 75, y: 50, icon: 'Copy', techStack: 'RocksDB / Bloom Filter', details: 'Filters out duplicate or mirror content' },
      { id: 'storage', name: 'Web Document Store', role: 'Stores raw HTML & parsed text', type: 'storage', x: 90, y: 50, icon: 'Database', techStack: 'Bigtable / S3', details: 'Keyed by reversed URL (com.example/page)' },
    ],
    connections: [
      { id: 'c1', from: 'url-frontier', to: 'downloader', label: 'Dispatch URL to Worker', protocol: 'TCP' },
      { id: 'c2', from: 'downloader', to: 'dns-resolver', label: 'Resolve Host IP', protocol: 'UDP' },
      { id: 'c3', from: 'downloader', to: 'content-dedup', label: 'Check SimHash Fingerprint', protocol: 'TCP' },
      { id: 'c4', from: 'content-dedup', to: 'storage', label: 'Store Raw Document', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Politeness Queue URL Dispatch',
        description: 'URL Frontier selects next URL for domain "techcrunch.com". Verifies 1-second politeness cooldown has elapsed.',
        fromNode: 'url-frontier',
        toNode: 'downloader',
        protocol: 'TCP',
        payload: { url: 'https://techcrunch.com/2024/06/ai-breakthrough', host: 'techcrunch.com', depth: 2 },
        codeRef: { file: 'crawler.go', lineHighlight: '15-28', funcName: 'FetchNextPoliteURL', codeExplanation: 'Locks domain queue; checks domain last_crawled_time in Redis.' },
        stateChange: 'Worker assigned URL; begins HTTP fetch.',
      },
    ],
    codeFiles: [
      {
        name: 'crawler.go',
        language: 'go',
        role: 'Politeness Queue & Robots.txt Parser',
        code: `package crawler

import (
	"net/http"
	"time"
)

type CrawlWorker struct {
	client *http.Client
}

func (w *CrawlWorker) FetchPage(targetURL string) ([]byte, error) {
	req, _ := http.NewRequest("GET", targetURL, nil)
	req.Header.Set("User-Agent", "NexoraBot/1.0 (+https://nexora.dev/bot)")

	resp, err := w.client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	// Parse body and extract links
	return ioutil.ReadAll(resp.Body)
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Web crawlers partition the URL Frontier into Priority queues (what to crawl first based on PageRank) and Politeness queues (one queue per hostname with strict delay timers). Parsed content is fingerprinted via 64-bit SimHash to filter duplicate text before committing to Bigtable storage.',
      databaseSchema: 'Bigtable row: com.techcrunch/2024/06/ai -> {contents:html, parsed:text, links:outbound}.',
      apiEndpoints: [{ method: 'POST', path: '/crawl/seed', desc: 'Injects seed URLs' }],
      bottlenecksAndTradeoffs: [
        'Crawler Traps & Infinite Loops: Dynamically generated calendar pages or infinite directories (/a/b/a/b/...) can trap crawlers. Solved by setting maximum URL length thresholds (e.g., 2,048 chars) and capping maximum crawl depth per domain.',
      ],
    },
  },
]
