import { BoardProvider } from '@/context';
import { Board } from '@/components/Board/Board';

function App() {
  return (
    <BoardProvider>
      <Board />
    </BoardProvider>
  );
}

export default App;
