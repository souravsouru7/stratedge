import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Reset Password");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
