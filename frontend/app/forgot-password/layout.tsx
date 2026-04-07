import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Forgot Password");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
