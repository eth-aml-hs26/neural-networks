import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <HomePage />
      </main>
      <Footer />
    </div>
  );
}
