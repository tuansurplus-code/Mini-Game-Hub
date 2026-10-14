import PublicContentView from "../../components/PublicContentView";
export default async function PublicContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicContentView slug={slug}/>;
}
