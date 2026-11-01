/** @type {import('next').NextConfig} */
const nextConfig = {
  // Its renderer loads the TTF files at runtime, so they must ship with the server functions.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: { "/**": ["./lib/invoicing/fonts/**"] },
  images: {
    remotePatterns: [
      // Product photos uploaded by staff (Supabase Storage public bucket).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Hosts used by the development seed catalogue.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.converty.shop" },
    ],
  },
};

export default nextConfig;
