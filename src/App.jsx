import MusicPlayer from "./components/MusicPlayer.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import { ThemeProvider } from "./context/theme.jsx";

// 应用根组件
// Provider 嵌套顺序：ThemeProvider 在外层，PlayerProvider 在内层。
// 这样播放器组件可以同时访问主题状态与播放器状态，互不干扰。
function App() {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <MusicPlayer />
      </PlayerProvider>
    </ThemeProvider>
  );
}

export default App;