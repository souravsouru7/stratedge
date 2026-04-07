import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Weekly Reports");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
