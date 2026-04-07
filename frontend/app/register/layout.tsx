import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Register");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
