import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- Type Definitions ---
type MatchState = {
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  completedSets: { p1: number; p2: number }[];
};

type MatchRecord = {
  id: string;
  date: string;
  p1Name: string;
  p2Name: string;
  winner: 1 | 2;
  format: string;
  thirdSetRule: string;
  score: { p1: number; p2: number }[];
};

const STORAGE_KEY = "@tennis_match_database";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    "setup" | "match" | "history"
  >("setup");

  // --- Setup State ---
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [format, setFormat] = useState("classic");
  const [thirdSet, setThirdSet] = useState("tiebreak");
  const [matchTbLength, setMatchTbLength] = useState(10);
  const [setTbLength, setSetTbLength] = useState(7);
  const [noAdRule, setNoAdRule] = useState(false);

  // --- Match Score State ---
  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [p1Games, setP1Games] = useState(0);
  const [p2Games, setP2Games] = useState(0);
  const [p1Sets, setP1Sets] = useState(0);
  const [p2Sets, setP2Sets] = useState(0);
  const [completedSets, setCompletedSets] = useState<
    { p1: number; p2: number }[]
  >([]);

  // --- History & Database State ---
  const [history, setHistory] = useState<MatchState[]>([]);
  const [matchDatabase, setMatchDatabase] = useState<MatchRecord[]>([]);

  // --- PERSISTENT STORAGE LOGIC ---
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) setMatchDatabase(JSON.parse(jsonValue));
    } catch (e) {
      console.error("Error loading database", e);
    }
  };

  const saveDatabase = async (newDatabase: MatchRecord[]) => {
    try {
      const jsonValue = JSON.stringify(newDatabase);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
      console.error("Error saving database", e);
    }
  };

  const clearAllHistory = () => {
    Alert.alert("Clear Database", "Delete all past matches?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setMatchDatabase([]);
          await AsyncStorage.removeItem(STORAGE_KEY);
        },
      },
    ]);
  };

  // --- Logic Helpers ---
  const isMatchTiebreak = p1Sets + p2Sets === 2 && thirdSet === "tiebreak";
  const isSetTiebreak =
    (format === "classic" && p1Games === 6 && p2Games === 6) ||
    (format === "fast4" && p1Games === 3 && p2Games === 3);
  const isTiebreak = isMatchTiebreak || isSetTiebreak;
  const targetTiebreakPoints = isMatchTiebreak ? matchTbLength : setTbLength;

  const tennisBallGraphic = require("../../assets/images/tennis_ball_graphic.png");
  const courtBackground = require("../../assets/images/court_background.png");

  // --- UI Components ---
  const GhibliTennisBallDial = ({
    title,
    subTitle,
    isSelected,
    onPress,
  }: {
    title: string;
    subTitle?: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.ballWrapper,
        isSelected ? styles.ballWrapperSelected : styles.ballWrapperUnselected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isSelected && (
        <Image
          source={tennisBallGraphic}
          style={styles.ballGraphicSelected}
          resizeMode="cover"
        />
      )}
      <View style={styles.ballContent}>
        <Text
          style={[
            styles.ballText,
            isSelected ? styles.textActive : styles.textInactive,
          ]}
        >
          {title}
        </Text>
        {subTitle && (
          <Text
            style={[
              styles.ballSubText,
              isSelected ? styles.textActive : styles.textInactive,
            ]}
          >
            {subTitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // --- Engine ---
  const saveToHistory = () => {
    setHistory([
      ...history,
      {
        p1Points,
        p2Points,
        p1Games,
        p2Games,
        p1Sets,
        p2Sets,
        completedSets: [...completedSets],
      },
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const prev = newHistory.pop();
    if (prev) {
      setP1Points(prev.p1Points);
      setP2Points(prev.p2Points);
      setP1Games(prev.p1Games);
      setP2Games(prev.p2Games);
      setP1Sets(prev.p1Sets);
      setP2Sets(prev.p2Sets);
      setCompletedSets(prev.completedSets);
      setHistory(newHistory);
    }
  };

  const recordMatchToDatabase = (
    winner: 1 | 2,
    finalSetP1: number,
    finalSetP2: number,
  ) => {
    const finalScoreArray = [
      ...completedSets,
      { p1: finalSetP1, p2: finalSetP2 },
    ];
    const newRecord: MatchRecord = {
      id: Date.now().toString(),
      date:
        new Date().toLocaleDateString() +
        " " +
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      p1Name: p1Name || "Player 1",
      p2Name: p2Name || "Player 2",
      winner,
      format: format === "classic" ? "Classic" : "Fast4",
      thirdSetRule: thirdSet === "full" ? "Full Set" : `TB to ${matchTbLength}`,
      score: finalScoreArray,
    };
    const updatedDB = [newRecord, ...matchDatabase];
    setMatchDatabase(updatedDB);
    saveDatabase(updatedDB);
  };

  const handleScore = (scorer: 1 | 2) => {
    saveToHistory();
    let p1 = p1Points;
    let p2 = p2Points;
    if (scorer === 1) p1++;
    else p2++;
    let gameWonBy = 0;

    if (isTiebreak) {
      if (p1 >= targetTiebreakPoints && p1 - p2 >= 2) gameWonBy = 1;
      else if (p2 >= targetTiebreakPoints && p2 - p1 >= 2) gameWonBy = 2;
    } else {
      if (p1 >= 4 && p1 - p2 >= 2) gameWonBy = 1;
      else if (p2 >= 4 && p2 - p1 >= 2) gameWonBy = 2;
      else if (noAdRule && p1 === 4 && p2 === 3) gameWonBy = 1;
      else if (noAdRule && p2 === 4 && p1 === 3) gameWonBy = 2;
      else if (!noAdRule && p1 === 4 && p2 === 4) {
        p1 = 3;
        p2 = 3;
      }
    }

    if (gameWonBy > 0) winGame(gameWonBy);
    else {
      setP1Points(p1);
      setP2Points(p2);
    }
  };

  const winGame = (winner: 1 | 2) => {
    setP1Points(0);
    setP2Points(0);
    let nP1G = p1Games;
    let nP2G = p2Games;
    if (winner === 1) nP1G++;
    else nP2G++;

    let setWonBy = 0;
    if (isMatchTiebreak || isSetTiebreak) {
      setWonBy = winner;
    } else if (format === "classic") {
      if (nP1G >= 6 && nP1G - nP2G >= 2) setWonBy = 1;
      else if (nP2G >= 6 && nP2G - nP1G >= 2) setWonBy = 2;
    } else if (format === "fast4") {
      if (nP1G === 4) setWonBy = 1;
      else if (nP2G === 4) setWonBy = 2;
    }

    if (setWonBy > 0) {
      if (setWonBy === 1 && p1Sets + 1 === 2) {
        recordMatchToDatabase(1, nP1G, nP2G);
        setCurrentScreen("setup");
        resetFullMatch();
        return;
      } else if (setWonBy === 2 && p2Sets + 1 === 2) {
        recordMatchToDatabase(2, nP1G, nP2G);
        setCurrentScreen("setup");
        resetFullMatch();
        return;
      }
      setCompletedSets([...completedSets, { p1: nP1G, p2: nP2G }]);
      setP1Games(0);
      setP2Games(0);
      if (setWonBy === 1) setP1Sets(p1Sets + 1);
      else setP2Sets(p2Sets + 1);
    } else {
      setP1Games(nP1G);
      setP2Games(nP2G);
    }
  };

  const resetFullMatch = () => {
    setP1Points(0);
    setP2Points(0);
    setP1Games(0);
    setP2Games(0);
    setP1Sets(0);
    setP2Sets(0);
    setCompletedSets([]);
    setHistory([]);
  };
  const getTennisScore = (p: number) => {
    const s = ["0", "15", "30", "40", "Ad"];
    return s[p] || "0";
  };

  // --- Screens ---

  if (currentScreen === "setup") {
    return (
      <ImageBackground
        source={courtBackground}
        style={styles.container}
        blurRadius={12}
      >
        <View style={styles.overlayDark}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: 60, paddingTop: 60 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.titleGhibli}>Match Setup</Text>

              <View style={styles.glassCard}>
                <Text style={styles.ghibliLabel}>Player Names</Text>
                <TextInput
                  style={styles.glassInput}
                  placeholder="Player 1"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={p1Name}
                  onChangeText={setP1Name}
                />
                <TextInput
                  style={styles.glassInput}
                  placeholder="Player 2"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={p2Name}
                  onChangeText={setP2Name}
                />
              </View>

              <Text style={styles.ghibliLabel}>Game Format</Text>
              <View style={styles.ballOptionContainer}>
                <GhibliTennisBallDial
                  title="Classic"
                  subTitle="(to 6)"
                  isSelected={format === "classic"}
                  onPress={() => setFormat("classic")}
                />
                <GhibliTennisBallDial
                  title="Fast4"
                  subTitle="(to 4)"
                  isSelected={format === "fast4"}
                  onPress={() => setFormat("fast4")}
                />
              </View>

              <Text style={styles.ghibliLabel}>Deuce Rule</Text>
              <View style={styles.ballOptionContainer}>
                <GhibliTennisBallDial
                  title="Ad"
                  subTitle="Std"
                  isSelected={!noAdRule}
                  onPress={() => setNoAdRule(false)}
                />
                <GhibliTennisBallDial
                  title="No-Ad"
                  subTitle="Sudden"
                  isSelected={noAdRule}
                  onPress={() => setNoAdRule(true)}
                />
              </View>

              <Text style={styles.ghibliLabel}>Set Tiebreak Length</Text>
              <View style={styles.ballOptionContainer}>
                <GhibliTennisBallDial
                  title="5"
                  subTitle="Pts"
                  isSelected={setTbLength === 5}
                  onPress={() => setSetTbLength(5)}
                />
                <GhibliTennisBallDial
                  title="7"
                  subTitle="Pts"
                  isSelected={setTbLength === 7}
                  onPress={() => setSetTbLength(7)}
                />
                <GhibliTennisBallDial
                  title="10"
                  subTitle="Pts"
                  isSelected={setTbLength === 10}
                  onPress={() => setSetTbLength(10)}
                />
              </View>

              <Text style={styles.ghibliLabel}>3rd Set Rules</Text>
              <View style={styles.ballOptionContainer}>
                <GhibliTennisBallDial
                  title="Full"
                  subTitle="Set"
                  isSelected={thirdSet === "full"}
                  onPress={() => setThirdSet("full")}
                />
                <GhibliTennisBallDial
                  title="Match"
                  subTitle="Tiebreak"
                  isSelected={thirdSet === "tiebreak"}
                  onPress={() => setThirdSet("tiebreak")}
                />
              </View>

              {thirdSet === "tiebreak" && (
                <>
                  <Text style={styles.ghibliLabel}>Match Tiebreak Length</Text>
                  <View style={styles.ballOptionContainer}>
                    <GhibliTennisBallDial
                      title="5"
                      subTitle="Pts"
                      isSelected={matchTbLength === 5}
                      onPress={() => setMatchTbLength(5)}
                    />
                    <GhibliTennisBallDial
                      title="7"
                      subTitle="Pts"
                      isSelected={matchTbLength === 7}
                      onPress={() => setMatchTbLength(7)}
                    />
                    <GhibliTennisBallDial
                      title="10"
                      subTitle="Pts"
                      isSelected={matchTbLength === 10}
                      onPress={() => setMatchTbLength(10)}
                    />
                  </View>
                </>
              )}

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.startMatchButton}
                  onPress={() => setCurrentScreen("match")}
                >
                  <Text style={styles.startMatchButtonText}>Start Match</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setCurrentScreen("history")}
                >
                  <Text style={styles.historyButtonText}>
                    📚 Match Database
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "history") {
    return (
      <ImageBackground
        source={courtBackground}
        style={styles.container}
        blurRadius={15}
      >
        <View style={styles.overlayDark}>
          <View style={{ paddingTop: 60, paddingBottom: 20, flex: 1 }}>
            <Text style={styles.titleGhibli}>Database</Text>
            {matchDatabase.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.ghibliLabel}>No matches recorded.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {matchDatabase.map((m) => (
                  <View key={m.id} style={styles.dbCard}>
                    <View style={styles.dbHeader}>
                      <Text style={styles.dbDate}>{m.date}</Text>
                      <Text style={styles.dbFormat}>
                        {m.format} ({m.thirdSetRule})
                      </Text>
                    </View>
                    <View style={styles.dbPlayersRow}>
                      <Text
                        style={[
                          styles.dbPlayerText,
                          m.winner === 1 && styles.dbWinnerText,
                        ]}
                      >
                        {m.winner === 1 ? "🏆 " : ""}
                        {m.p1Name}
                      </Text>
                      <Text style={styles.dbVsText}>vs</Text>
                      <Text
                        style={[
                          styles.dbPlayerText,
                          m.winner === 2 && styles.dbWinnerText,
                        ]}
                      >
                        {m.p2Name}
                        {m.winner === 2 ? " 🏆" : ""}
                      </Text>
                    </View>
                    <View style={styles.dbScoreContainer}>
                      {m.score.map((s, i) => (
                        <View key={i} style={styles.dbSetBox}>
                          <Text style={styles.dbSetScore}>
                            {s.p1} - {s.p2}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearAllHistory}
                >
                  <Text style={styles.clearButtonText}>
                    🗑️ Clear All Matches
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen("setup")}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={courtBackground}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlayLight}>
        <Text style={styles.titleMatch}>Court View</Text>
        <View style={styles.ruleBanner}>
          <Text style={styles.ruleInfo}>
            {format === "classic" ? "Classic" : "Fast4"} |{" "}
            {noAdRule ? "No-Ad" : "Ad"}
            {isMatchTiebreak
              ? `\n🎾 MATCH TIEBREAK TO ${matchTbLength} 🎾`
              : ""}
          </Text>
        </View>
        <View style={styles.tvScoreboardGlass}>
          <View style={styles.scoreRowHeader}>
            <Text style={[styles.scoreCell, styles.nameCell]}></Text>
            {completedSets.map((_, i) => (
              <Text key={i} style={styles.scoreCell}>
                S{i + 1}
              </Text>
            ))}
            <Text style={[styles.scoreCell, styles.activeHeaderCell]}>G</Text>
            <Text style={[styles.scoreCell, styles.pointHeaderCell]}>Pts</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreCell, styles.nameCell]} numberOfLines={1}>
              {p1Name || "P1"}
            </Text>
            {completedSets.map((s, i) => (
              <Text key={i} style={styles.scoreCell}>
                {s.p1}
              </Text>
            ))}
            <Text style={[styles.scoreCell, styles.activeCell]}>{p1Games}</Text>
            <Text style={[styles.scoreCell, styles.pointCell]}>
              {isTiebreak ? p1Points : getTennisScore(p1Points)}
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreCell, styles.nameCell]} numberOfLines={1}>
              {p2Name || "P2"}
            </Text>
            {completedSets.map((s, i) => (
              <Text key={i} style={styles.scoreCell}>
                {s.p2}
              </Text>
            ))}
            <Text style={[styles.scoreCell, styles.activeCell]}>{p2Games}</Text>
            <Text style={[styles.scoreCell, styles.pointCell]}>
              {isTiebreak ? p2Points : getTennisScore(p2Points)}
            </Text>
          </View>
        </View>
        <View style={styles.actionArea}>
          <View style={styles.playerCardGlass}>
            <Text style={styles.actionName}>{p1Name || "P1"}</Text>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => handleScore(1)}
            >
              <Text style={styles.scoreButtonText}>+ Point</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.playerCardGlass}>
            <Text style={styles.actionName}>{p2Name || "P2"}</Text>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => handleScore(2)}
            >
              <Text style={styles.scoreButtonText}>+ Point</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bottomActionsBox}>
          {history.length > 0 && (
            <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
              <Text style={styles.undoButtonText}>↩ Undo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setCurrentScreen("setup");
              resetFullMatch();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

// --- Smooth Styling ---

const GhibliFont = Platform.OS === "ios" ? "Cochin" : "serif";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2b3a2e" },
  overlayDark: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 20,
  },
  overlayLight: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  titleGhibli: {
    fontSize: 38,
    fontWeight: "600", // Smoother than 'bold'
    fontFamily: GhibliFont,
    textAlign: "center",
    color: "#FDF6E3",
    marginBottom: 25,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 8,
    letterSpacing: 1.2,
  },
  titleMatch: {
    fontSize: 30,
    fontWeight: "600",
    fontFamily: GhibliFont,
    textAlign: "center",
    color: "#FDF6E3",
    marginBottom: 15,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 5,
  },
  ghibliLabel: {
    fontSize: 19,
    fontWeight: "600",
    fontFamily: GhibliFont,
    marginTop: 20,
    marginBottom: 10,
    color: "#FDF6E3",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },

  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  glassInput: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
    fontFamily: GhibliFont,
  },

  ballOptionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: 10,
  },
  ballWrapper: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ballWrapperUnselected: { backgroundColor: "rgba(255, 255, 255, 0.28)" },
  ballWrapperSelected: {
    backgroundColor: "transparent",
    transform: [{ scale: 1.15 }],
  },
  ballGraphicSelected: {
    position: "absolute",
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.25 }],
  },
  ballContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  ballText: { fontSize: 16, fontWeight: "bold", fontFamily: GhibliFont },
  ballSubText: { fontSize: 12, fontWeight: "600", fontFamily: GhibliFont },
  textInactive: { color: "#FFF" },
  textActive: { color: "#1a1a1a" },

  actionButtonsContainer: { marginTop: 40, gap: 18, paddingBottom: 20 },
  startMatchButton: {
    backgroundColor: "rgba(120, 165, 90, 0.95)",
    padding: 20,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  startMatchButtonText: {
    color: "#FDF6E3",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: GhibliFont,
    letterSpacing: 0.5,
  },
  historyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  historyButtonText: {
    color: "#FDF6E3",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },

  dbCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dbHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: 8,
    marginBottom: 10,
  },
  dbDate: { color: "#EEE", fontSize: 12, fontFamily: GhibliFont },
  dbFormat: {
    color: "#DFFF00",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },
  dbPlayersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dbPlayerText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    fontFamily: GhibliFont,
  },
  dbWinnerText: { color: "#DFFF00", fontWeight: "900" },
  dbVsText: { color: "#AAA", fontFamily: GhibliFont, fontSize: 14 },
  dbScoreContainer: { flexDirection: "row", justifyContent: "center", gap: 10 },
  dbSetBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dbSetScore: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },

  backButton: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },
  clearButton: { padding: 15, alignItems: "center" },
  clearButtonText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },

  ruleBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    padding: 12,
    borderRadius: 16,
    marginVertical: 12,
  },
  ruleInfo: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#2b3a2e",
    fontFamily: GhibliFont,
  },
  tvScoreboardGlass: {
    backgroundColor: "rgba(20, 30, 20, 0.82)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingVertical: 8,
  },
  scoreRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
  },
  scoreCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "#fff",
    fontFamily: GhibliFont,
  },
  nameCell: { flex: 3, textAlign: "left", fontWeight: "600" },
  activeHeaderCell: { color: "#DFFF00" },
  pointHeaderCell: { color: "#FFB347" },
  activeCell: {
    color: "#DFFF00",
    fontWeight: "600",
    fontSize: 18,
    fontFamily: GhibliFont,
  },
  pointCell: {
    color: "#FFB347",
    fontWeight: "600",
    fontSize: 18,
    fontFamily: GhibliFont,
  },

  actionArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  playerCardGlass: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FDF6E3",
    marginBottom: 15,
    fontFamily: GhibliFont,
  },
  scoreButton: {
    backgroundColor: "rgba(255, 179, 71, 0.95)",
    paddingVertical: 18,
    borderRadius: 18,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scoreButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: GhibliFont,
  },

  bottomActionsBox: {
    marginTop: "auto",
    marginBottom: 40,
    alignItems: "center",
    gap: 18,
  },
  undoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  undoButtonText: {
    color: "#FDF6E3",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },
  cancelButton: { padding: 10 },
  cancelButtonText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: GhibliFont,
  },
});
