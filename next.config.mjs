/** @type {import('next').NextConfig} */
const nextConfig = {
  // Its renderer loads the TTF files at runtime, so they must ship with the server functions.
  serverExternalPackages: ["@react-pdf/renderer"],
  // pdfkit reaches its standard fonts through a dynamic require, which file tracing can't follow.
  outputFileTracingIncludes: { "/**": ["./lib/invoicing/fonts/**", "./node_modules/pdfkit/js/standard-fonts/**/*.cjs"] },
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
