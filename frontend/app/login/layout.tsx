import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Login");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
