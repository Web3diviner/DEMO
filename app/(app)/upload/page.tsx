import dynamic from "next/dynamic";

/**
 * Upload route. The uploader (and tus-js-client, transitively) is dynamically imported so its weight
 * only loads when a creator actually uploads — never in the shared/initial bundle.
 */
const Uploader = dynamic(() => import("@/components/upload/uploader").then((m) => m.Uploader));

export const metadata = { title: "Upload" };

export default function UploadPage() {
  return <Uploader />;
}
