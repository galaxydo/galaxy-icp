import { serve } from "https://deno.land/std/http/server.ts";
import { Handler } from "https://deno.land/std/http/server.ts";

const port = 1120; // Change this to your preferred port

// Create a handler that will process each request
const handler: Handler = async (req) => {
  try {
    // Extract the URL from the query string
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Please provide a URL as a query parameter.", {
        status: 400,
      });
    }
    const newRequestInitHeaders = new Headers(req.headers);
    newRequestInitHeaders.set("Origin", new URL(targetUrl).origin);
    // Modify the origin of the request to prevent CORS issues
    const newRequestInit: RequestInit = {
      method: req.method, // Preserve the original request method
      headers: newRequestInitHeaders, // Use the original headers
    };


    // Fetch the target URL
    const response = await fetch(targetUrl, newRequestInit);

    // Clone the response so that we can modify headers
    const newHeaders = new Headers(response.headers);

    // Modify or remove headers to ensure the content can be iframed and CORS won't block it
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.delete("X-Frame-Options");
    newHeaders.delete("Content-Security-Policy");
    newHeaders.delete("X-Content-Security-Policy");
    newHeaders.delete("X-WebKit-CSP");

    // Check if the request is for HTML content
    if (response.headers.get("Content-Type")?.includes("text/html")) {
      // Read the response body as text
      const body = await response.text();

      // Rewrite URLs in the HTML to go through the proxy
      const modifiedBody = body.replace(/(href|src)=["'](http[^"']+)["']/g, `$1="/?url=$2"`);

      // Serve the modified content
      return new Response(modifiedBody, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // Serve non-HTML content without any URL modifications
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    console.error(error);
    return new Response("An error occurred while trying to proxy the request.", {
      status: 500,
    });
  }
};

// Start serving requests
serve(handler, { port });
console.log(`Proxy server is running on http://localhost:${port}/`);
