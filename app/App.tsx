import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <>
      <RootNavigator />
      {/* Light icons (clock, battery) on our dark background */}
      <StatusBar style="light" />
    </>
  );
}
