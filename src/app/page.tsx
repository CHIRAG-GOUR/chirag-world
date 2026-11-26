import ClientApp from '@/components/ClientApp';

// Server component shell; the WebGL experience is client-only (see ClientApp).
export default function Home() {
  return <ClientApp />;
}
