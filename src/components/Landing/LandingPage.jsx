import { Header } from "../Navbar/Header";
import { Overview } from "./Overview";
import { Capabilities } from "./Capabilities";
import { SimulationJourney } from "./SimulationJourney";
import { Technology } from "./Technology";
import { Contact } from "./Contact";
import { Resources } from "./Resources";

export function LandingPage() {
  return (
    <div className="landing">
      <Header />
      <main>
        <Overview />
        <Capabilities />
        <SimulationJourney />
        <Technology />
        <Contact />
      </main>
      <Resources />
    </div>
  );
}
