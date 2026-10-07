import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="content" className="py-32">
      <Container>
        <h1 className="text-3xl font-semibold">Not found</h1>
        <p className="mt-3 text-fg-muted">That page does not exist.</p>
        <div className="mt-8">
          <Button href="/">Home</Button>
        </div>
      </Container>
    </main>
  );
}
