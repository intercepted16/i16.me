import type { APIRoute } from "astro";
import Redis from 'ioredis';

export const prerender = false;

// Initialize Redis client
const redis = new Redis(); // Configure as needed (e.g., `new Redis({ host: 'localhost', port: 6379 })`)

export const GET: APIRoute = async ({ params }) => {
    const { user } = params;

    // Check that it's within the GitHub limits of characters
    if (!user || user.length < 6 || user.length > 32) {
        const response = new Response(JSON.stringify({
            error: "Invalid GitHub username",
            status: 400,
            code: "INVALID_INPUT"
        }), { status: 400, statusText: "Invalid input." });
        response.headers.set('Cache-Control', 'public, max-age=21600'); // 6 hours
        return response;
    }

    const cacheKey = `github_user_repos:${user}`;

    // Try to get data from Redis cache
    let cachedData = await redis.get(cacheKey);

    if (cachedData) {
        console.log("Serving from cache");
        const response = new Response(cachedData, { status: 200, statusText: "OK" });
        response.headers.set('Cache-Control', 'public, max-age=21600'); // 6 hours
        return response;
    }

    // Fetch data from GitHub API if not cached
    const res = await fetch(`https://api.github.com/users/${user}/repos`);
    const data = await res.json();

    // Cache the data in Redis for 6 hours (21600 seconds)
    await redis.set(cacheKey, JSON.stringify(data), 'EX', 21600);

    const response = new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText });
    response.headers.set('Cache-Control', 'public, max-age=21600'); // 6 hours
    return response;
}
