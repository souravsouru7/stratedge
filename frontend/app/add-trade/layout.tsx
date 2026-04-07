import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Add Trade");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
