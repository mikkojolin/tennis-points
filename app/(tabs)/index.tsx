import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 🔥 FIREBASE INITIALIZATION
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AiZaSyDU6tKXBeauz7VOVvdq_8-s2tsGu9VWveM",
  authDomain: "tennis-points-2014a.firebaseapp.com",
  databaseURL:
    "https://tennis-points-2014a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tennis-points-2014a",
  storageBucket: "tennis-points-2014a.firebasestorage.app",
  messagingSenderId: "751703571864",
  appId: "1:751703571864:web:938d65941c6bf0b919ffed",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Assets ---
const tennisBallGraphic = require("../../assets/images/tennis_ball_graphic.png");
const courtBackground = require("../../assets/images/court_background.png");
const volleyBallGraphic = require("../../assets/images/volleyball.png");
const beachBackground = require("../../assets/images/beach.png");

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
  sport: string;
  format: string;
  thirdSetRule: string;
  score: { p1: number; p2: number }[];
};

const STORAGE_KEY = "@sports_match_database";

// --- UI COMPONENTS ---
const SportDial = ({ title, subTitle, isSelected, onPress, icon }: any) => (
  <TouchableOpacity
    style={[
      styles.ballWrapper,
      isSelected ? styles.ballWrapperSelected : styles.ballWrapperUnselected,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {isSelected && (
      <View style={styles.imageMask}>
        <Image
          source={icon}
          style={styles.ballGraphicSelected}
          resizeMode="cover"
        />
      </View>
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    | "sportSelect"
    | "setup"
    | "volleySetup"
    | "match"
    | "volleyMatch"
    | "history"
    | "victory"
  >("sportSelect");

  const [selectedSport, setSelectedSport] = useState<"tennis" | "volleyball">(
    "tennis",
  );

  // --- Shared Setup State ---
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [p1Sets, setP1Sets] = useState(0);
  const [p2Sets, setP2Sets] = useState(0);
  const [completedSets, setCompletedSets] = useState<
    { p1: number; p2: number }[]
  >([]);
  const [matchWinner, setMatchWinner] = useState<1 | 2 | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [history, setHistory] = useState<MatchState[]>([]);
  const [matchDatabase, setMatchDatabase] = useState<MatchRecord[]>([]);

  // --- Tennis Specific State ---
  const [format, setFormat] = useState("classic");
  const [thirdSet, setThirdSet] = useState("tiebreak");
  const [matchTbLength, setMatchTbLength] = useState(10);
  const [setTbLength, setSetTbLength] = useState(7);
  const [noAdRule, setNoAdRule] = useState(false);
  const [p1Games, setP1Games] = useState(0);
  const [p2Games, setP2Games] = useState(0);

  // --- Volleyball Specific State ---
  const [volleySetsToWin, setVolleySetsToWin] = useState(2); // Best of 3 means 2 sets to win
  const [volleyPointsPerSet, setVolleyPointsPerSet] = useState(21);
  const [sideChangeInterval, setSideChangeInterval] = useState(7);

  // --- LOGIC HELPERS ---
  const isMatchTiebreak = p1Sets + p2Sets === 2 && thirdSet === "tiebreak";
  const isSetTiebreak =
    (format === "classic" && p1Games === 6 && p2Games === 6) ||
    (format === "fast4" && p1Games === 3 && p2Games === 3);
  const isTiebreak = isMatchTiebreak || isSetTiebreak;
  const targetTiebreakPoints = isMatchTiebreak ? matchTbLength : setTbLength;

  const getTennisScore = (p: number) => {
    const s = ["0", "15", "30", "40", "Ad"];
    return s[p] || "0";
  };

  // Volleyball side change reminder logic
  const totalVolleyPoints = p1Points + p2Points;
  const showSideChangeReminder =
    selectedSport === "volleyball" &&
    totalVolleyPoints > 0 &&
    totalVolleyPoints % sideChangeInterval === 0;

  // Determine current background based on sport
  const currentBackground =
    selectedSport === "volleyball" ? beachBackground : courtBackground;

  // --- SIDE EFFECTS ---
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) setMatchDatabase(JSON.parse(jsonValue));
      } catch (err) {
        console.error("Database load error", err);
      }
    };
    loadDatabase();
  }, []);

  useEffect(() => {
    if (matchId) {
      const matchRef = ref(db, "live_matches/" + matchId);
      set(matchRef, {
        sport: selectedSport,
        p1Name: p1Name || "Player 1",
        p2Name: p2Name || "Player 2",
        p1Points:
          selectedSport === "tennis"
            ? isTiebreak
              ? p1Points
              : getTennisScore(p1Points)
            : p1Points,
        p2Points:
          selectedSport === "tennis"
            ? isTiebreak
              ? p2Points
              : getTennisScore(p2Points)
            : p2Points,
        p1Games,
        p2Games,
        p1Sets,
        p2Sets,
        completedSets,
        isTiebreak,
        lastUpdated: Date.now(),
      }).catch((err) => console.log("Firebase Error:", err));
    }
  }, [
    p1Points,
    p2Points,
    p1Games,
    p2Games,
    p1Sets,
    p2Sets,
    completedSets,
    isTiebreak,
    p1Name,
    p2Name,
    matchId,
    selectedSport,
  ]);

  // --- ENGINE FUNCTIONS ---
  const saveDatabase = async (newDatabase: MatchRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDatabase));
    } catch (err) {
      console.error("Save error", err);
    }
  };

  const handleLiveShare = async () => {
    const newId = `LOHJA-${Math.floor(1000 + Math.random() * 9000)}`;
    setMatchId(newId);
    const shareUrl = `https://mikkojolin.github.io/tennis-points/?match=${newId}`;
    try {
      await Share.share({
        message: `🎾 Live Match!\n${p1Name || "P1"} vs ${p2Name || "P2"}\nLink: ${shareUrl}`,
      });
    } catch {
      console.log("Share failed");
    }
  };

  const handleTennisScore = (scorer: 1 | 2) => {
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
    let p1 = p1Points;
    let p2 = p2Points;
    scorer === 1 ? p1++ : p2++;
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

    if (gameWonBy > 0) {
      setP1Points(0);
      setP2Points(0);
      let nP1G = p1Games;
      let nP2G = p2Games;
      gameWonBy === 1 ? nP1G++ : nP2G++;
      let setWonBy = 0;

      if (isMatchTiebreak || isSetTiebreak) setWonBy = gameWonBy;
      else if (format === "classic") {
        if (nP1G >= 6 && nP1G - nP2G >= 2) setWonBy = 1;
        else if (nP2G >= 6 && nP2G - nP1G >= 2) setWonBy = 2;
      } else {
        if (nP1G === 4) setWonBy = 1;
        else if (nP2G === 4) setWonBy = 2;
      }

      if (setWonBy > 0) {
        if (
          (setWonBy === 1 && p1Sets + 1 === 2) ||
          (setWonBy === 2 && p2Sets + 1 === 2)
        ) {
          recordMatchResult(setWonBy as 1 | 2, nP1G, nP2G);
        } else {
          setCompletedSets([...completedSets, { p1: nP1G, p2: nP2G }]);
          setP1Games(0);
          setP2Games(0);
          setWonBy === 1 ? setP1Sets(p1Sets + 1) : setP2Sets(p2Sets + 1);
        }
      } else {
        setP1Games(nP1G);
        setP2Games(nP2G);
      }
    } else {
      setP1Points(p1);
      setP2Points(p2);
    }
  };

  const handleVolleyScore = (scorer: 1 | 2) => {
    setHistory([
      ...history,
      {
        p1Points,
        p2Points,
        p1Games: 0,
        p2Games: 0,
        p1Sets,
        p2Sets,
        completedSets: [...completedSets],
      },
    ]);
    let p1 = p1Points;
    let p2 = p2Points;
    scorer === 1 ? p1++ : p2++;

    let currentSetTarget = volleyPointsPerSet;
    const isDecidingSet =
      p1Sets + p2Sets === volleySetsToWin * 2 - 2 && volleySetsToWin > 1;

    // In deciding sets, standard rules usually cap at 15
    if (isDecidingSet && currentSetTarget > 15) {
      currentSetTarget = 15;
    }

    if (p1 >= currentSetTarget && p1 - p2 >= 2) {
      if (p1Sets + 1 === volleySetsToWin) recordMatchResult(1, p1, p2);
      else {
        setCompletedSets([...completedSets, { p1, p2 }]);
        setP1Points(0);
        setP2Points(0);
        setP1Sets(p1Sets + 1);
      }
    } else if (p2 >= currentSetTarget && p2 - p1 >= 2) {
      if (p2Sets + 1 === volleySetsToWin) recordMatchResult(2, p1, p2);
      else {
        setCompletedSets([...completedSets, { p1, p2 }]);
        setP1Points(0);
        setP2Points(0);
        setP2Sets(p2Sets + 1);
      }
    } else {
      setP1Points(p1);
      setP2Points(p2);
    }
  };

  const recordMatchResult = (
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
      date: new Date().toLocaleString(),
      p1Name: p1Name || "Player 1",
      p2Name: p2Name || "Player 2",
      winner,
      sport: selectedSport === "tennis" ? "Tennis" : "Volleyball",
      format:
        selectedSport === "tennis"
          ? format
          : `Best of ${volleySetsToWin === 1 ? 1 : volleySetsToWin === 2 ? 3 : 5}`,
      thirdSetRule:
        selectedSport === "tennis"
          ? thirdSet === "full"
            ? "Full Set"
            : `TB to ${matchTbLength}`
          : `Target: ${volleyPointsPerSet}`,
      score: finalScoreArray,
    };
    const updatedDB = [newRecord, ...matchDatabase];
    setMatchDatabase(updatedDB);
    saveDatabase(updatedDB);
    setCompletedSets(finalScoreArray);
    setMatchWinner(winner);
    setCurrentScreen("victory");
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

  const resetFullMatch = () => {
    setP1Points(0);
    setP2Points(0);
    setP1Games(0);
    setP2Games(0);
    setP1Sets(0);
    setP2Sets(0);
    setCompletedSets([]);
    setHistory([]);
    setMatchWinner(null);
    setMatchId(null);
  };

  // --- SCREENS ---
  if (currentScreen === "sportSelect") {
    return (
      <ImageBackground
        source={currentBackground}
        style={styles.container}
        blurRadius={15}
      >
        <View style={styles.overlayDark}>
          <Text style={styles.title}>Select Sport</Text>
          <View style={styles.ballOptionContainer}>
            <SportDial
              title="Tennis"
              isSelected={selectedSport === "tennis"}
              icon={tennisBallGraphic}
              onPress={() => setSelectedSport("tennis")}
            />
            <SportDial
              title="Volley"
              isSelected={selectedSport === "volleyball"}
              icon={volleyBallGraphic}
              onPress={() => setSelectedSport("volleyball")}
            />
          </View>
          <TouchableOpacity
            style={styles.startMatchButton}
            onPress={() =>
              setCurrentScreen(
                selectedSport === "tennis" ? "setup" : "volleySetup",
              )
            }
          >
            <Text style={styles.startMatchButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyButton, { marginTop: 20 }]}
            onPress={() => setCurrentScreen("history")}
          >
            <Text style={styles.historyButtonText}>📚 Match Database</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

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
              <View style={styles.headerArea}>
                <Text style={styles.mainTitle}>Tennis Points</Text>
                <View style={styles.titleDivider} />
                <Text style={styles.setupSubtitle}>Match Setup</Text>
              </View>
              <View style={styles.glassCard}>
                <Text style={styles.Label}>Player Names</Text>
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
              <Text style={styles.Label}>Game Format</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Classic"
                  subTitle="(to 6)"
                  isSelected={format === "classic"}
                  icon={tennisBallGraphic}
                  onPress={() => setFormat("classic")}
                />
                <SportDial
                  title="Fast4"
                  subTitle="(to 4)"
                  isSelected={format === "fast4"}
                  icon={tennisBallGraphic}
                  onPress={() => setFormat("fast4")}
                />
              </View>
              <Text style={styles.Label}>Deuce Rule</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Ad"
                  subTitle="Std"
                  isSelected={!noAdRule}
                  icon={tennisBallGraphic}
                  onPress={() => setNoAdRule(false)}
                />
                <SportDial
                  title="No-Ad"
                  subTitle="Sudden"
                  isSelected={noAdRule}
                  icon={tennisBallGraphic}
                  onPress={() => setNoAdRule(true)}
                />
              </View>
              <Text style={styles.Label}>Set Tiebreak Length</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="5"
                  subTitle="Pts"
                  isSelected={setTbLength === 5}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(5)}
                />
                <SportDial
                  title="7"
                  subTitle="Pts"
                  isSelected={setTbLength === 7}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(7)}
                />
                <SportDial
                  title="10"
                  subTitle="Pts"
                  isSelected={setTbLength === 10}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(10)}
                />
              </View>
              <Text style={styles.Label}>3rd Set Rules</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Full"
                  subTitle="Set"
                  isSelected={thirdSet === "full"}
                  icon={tennisBallGraphic}
                  onPress={() => setThirdSet("full")}
                />
                <SportDial
                  title="Match"
                  subTitle="Tiebreak"
                  isSelected={thirdSet === "tiebreak"}
                  icon={tennisBallGraphic}
                  onPress={() => setThirdSet("tiebreak")}
                />
              </View>
              {thirdSet === "tiebreak" && (
                <>
                  <Text style={styles.Label}>Match Tiebreak Length</Text>
                  <View style={styles.ballOptionContainer}>
                    <SportDial
                      title="5"
                      subTitle="Pts"
                      isSelected={matchTbLength === 5}
                      icon={tennisBallGraphic}
                      onPress={() => setMatchTbLength(5)}
                    />
                    <SportDial
                      title="7"
                      subTitle="Pts"
                      isSelected={matchTbLength === 7}
                      icon={tennisBallGraphic}
                      onPress={() => setMatchTbLength(7)}
                    />
                    <SportDial
                      title="10"
                      subTitle="Pts"
                      isSelected={matchTbLength === 10}
                      icon={tennisBallGraphic}
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
                  onPress={() => setCurrentScreen("sportSelect")}
                >
                  <Text style={styles.historyButtonText}>← Back to Sports</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "volleySetup") {
    return (
      <ImageBackground
        source={beachBackground}
        style={styles.container}
        blurRadius={12}
      >
        <View style={styles.beachOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: 60, paddingTop: 60 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerArea}>
                <Text
                  style={[
                    styles.mainTitle,
                    { color: "#fff", textShadowColor: "#000" },
                  ]}
                >
                  Volleyball
                </Text>
                <View
                  style={[styles.titleDivider, { backgroundColor: "#fff" }]}
                />
                <Text style={[styles.setupSubtitle, { color: "#fff" }]}>
                  Match Setup
                </Text>
              </View>
              <View style={styles.beachGlassCard}>
                <Text
                  style={[
                    styles.Label,
                    { color: "#fff", textShadowColor: "#000" },
                  ]}
                >
                  Team Names
                </Text>
                <TextInput
                  style={styles.beachInput}
                  placeholder="Team 1"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={p1Name}
                  onChangeText={setP1Name}
                />
                <TextInput
                  style={styles.beachInput}
                  placeholder="Team 2"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={p2Name}
                  onChangeText={setP2Name}
                />
              </View>

              <Text
                style={[
                  styles.Label,
                  { color: "#fff", textShadowColor: "#000" },
                ]}
              >
                Best of Sets
              </Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="1"
                  subTitle="Set"
                  isSelected={volleySetsToWin === 1}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(1)}
                />
                <SportDial
                  title="3"
                  subTitle="Sets"
                  isSelected={volleySetsToWin === 2}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(2)}
                />
                <SportDial
                  title="5"
                  subTitle="Sets"
                  isSelected={volleySetsToWin === 3}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(3)}
                />
              </View>

              <Text
                style={[
                  styles.Label,
                  { color: "#fff", textShadowColor: "#000" },
                ]}
              >
                Points per Set
              </Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="15"
                  isSelected={volleyPointsPerSet === 15}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(15)}
                />
                <SportDial
                  title="21"
                  isSelected={volleyPointsPerSet === 21}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(21)}
                />
                <SportDial
                  title="25"
                  isSelected={volleyPointsPerSet === 25}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(25)}
                />
              </View>

              <Text
                style={[
                  styles.Label,
                  { color: "#fff", textShadowColor: "#000" },
                ]}
              >
                Change Sides Every
              </Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="5"
                  subTitle="Pts"
                  isSelected={sideChangeInterval === 5}
                  icon={volleyBallGraphic}
                  onPress={() => setSideChangeInterval(5)}
                />
                <SportDial
                  title="7"
                  subTitle="Pts"
                  isSelected={sideChangeInterval === 7}
                  icon={volleyBallGraphic}
                  onPress={() => setSideChangeInterval(7)}
                />
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.startMatchButton,
                    { backgroundColor: "#ffb347" },
                  ]}
                  onPress={() => setCurrentScreen("volleyMatch")}
                >
                  <Text style={styles.startMatchButtonText}>Start Match</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.historyButton,
                    { backgroundColor: "rgba(0,0,0,0.2)" },
                  ]}
                  onPress={() => setCurrentScreen("sportSelect")}
                >
                  <Text style={styles.historyButtonText}>← Back to Sports</Text>
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
        source={currentBackground}
        style={styles.container}
        blurRadius={15}
      >
        <View style={styles.overlayDark}>
          <View style={{ paddingTop: 60, paddingBottom: 20, flex: 1 }}>
            <Text style={styles.title}>Database</Text>
            {matchDatabase.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.Label}>No matches recorded.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {matchDatabase.map((m) => (
                  <View key={m.id} style={styles.dbCard}>
                    <View style={styles.dbHeader}>
                      <Text style={styles.dbDate}>
                        {m.date} - {m.sport}
                      </Text>
                      <Text style={styles.dbFormat}>
                        {m.format} | {m.thirdSetRule}
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
                  onPress={() => {
                    setMatchDatabase([]);
                    AsyncStorage.removeItem(STORAGE_KEY);
                  }}
                >
                  <Text style={styles.clearButtonText}>
                    🗑️ Clear All Matches
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen("sportSelect")}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "victory") {
    const winnerName =
      matchWinner === 1 ? p1Name || "Team 1" : p2Name || "Team 2";
    return (
      <ImageBackground
        source={currentBackground}
        style={styles.container}
        blurRadius={5}
      >
        <View
          style={[
            styles.overlayDark,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={styles.victorySubtitle}>Victory!</Text>
          <Text style={styles.victoryTitle}>{winnerName}</Text>
          <View style={styles.victoryScoreBox}>
            {completedSets.map((set, i) => (
              <View key={i} style={styles.victorySetCard}>
                <Text style={styles.victorySetText}>
                  {set.p1} - {set.p2}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.startMatchButton}
            onPress={() => {
              setCurrentScreen("sportSelect");
              resetFullMatch();
            }}
          >
            <Text style={styles.startMatchButtonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "volleyMatch") {
    return (
      <ImageBackground
        source={beachBackground}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.beachOverlay}>
          <Text style={styles.titleMatch}>Beach Court</Text>
          {matchId && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveIndicatorText}>
                ● LIVE BROADCAST: {matchId}
              </Text>
            </View>
          )}

          {showSideChangeReminder && (
            <View style={styles.sideChangeAlert}>
              <Text style={styles.sideChangeText}>🔄 CHANGE SIDES! 🔄</Text>
            </View>
          )}

          <View style={styles.beachGlassCard}>
            <View style={styles.scoreRowHeader}>
              <Text style={[styles.scoreCell, styles.nameCell]}></Text>
              {completedSets.map((_, i) => (
                <Text key={i} style={styles.scoreCell}>
                  S{i + 1}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeHeaderCell]}>S</Text>
              <Text style={[styles.scoreCell, styles.pointHeaderCell]}>P</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                numberOfLines={1}
              >
                {p1Name || "Team 1"}
              </Text>
              {completedSets.map((s, i) => (
                <Text key={i} style={styles.scoreCell}>
                  {s.p1}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeCell]}>
                {p1Sets}
              </Text>
              <Text style={[styles.scoreCell, styles.pointCell]}>
                {p1Points}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                numberOfLines={1}
              >
                {p2Name || "Team 2"}
              </Text>
              {completedSets.map((s, i) => (
                <Text key={i} style={styles.scoreCell}>
                  {s.p2}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeCell]}>
                {p2Sets}
              </Text>
              <Text style={[styles.scoreCell, styles.pointCell]}>
                {p2Points}
              </Text>
            </View>
          </View>
          <View style={styles.actionArea}>
            <View style={styles.playerCardGlass}>
              <Text style={styles.actionName}>{p1Name || "Team 1"}</Text>
              <TouchableOpacity
                style={[styles.scoreButton, { backgroundColor: "#ffb347" }]}
                onPress={() => handleVolleyScore(1)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.playerCardGlass}>
              <Text style={styles.actionName}>{p2Name || "Team 2"}</Text>
              <TouchableOpacity
                style={[styles.scoreButton, { backgroundColor: "#ffb347" }]}
                onPress={() => handleVolleyScore(2)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomActionsBox}>
            <TouchableOpacity
              style={styles.liveShareBtn}
              onPress={handleLiveShare}
            >
              <Text style={styles.liveShareBtnText}>📡 Share Live Score</Text>
            </TouchableOpacity>
            {history.length > 0 && (
              <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                <Text style={styles.undoButtonText}>↩ Undo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCurrentScreen("sportSelect");
                resetFullMatch();
              }}
            >
              <Text style={[styles.cancelButtonText, { color: "#fff" }]}>
                Cancel Match
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "match") {
    return (
      <ImageBackground
        source={courtBackground}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.overlayLight}>
          <Text style={styles.titleMatch}>Court View</Text>
          {matchId && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveIndicatorText}>
                ● LIVE BROADCAST: {matchId}
              </Text>
            </View>
          )}
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
              <Text style={[styles.scoreCell, styles.pointHeaderCell]}>P</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                numberOfLines={1}
              >
                {p1Name || "P1"}
              </Text>
              {completedSets.map((s, i) => (
                <Text key={i} style={styles.scoreCell}>
                  {s.p1}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeCell]}>
                {p1Games}
              </Text>
              <Text style={[styles.scoreCell, styles.pointCell]}>
                {isTiebreak ? p1Points : getTennisScore(p1Points)}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                numberOfLines={1}
              >
                {p2Name || "P2"}
              </Text>
              {completedSets.map((s, i) => (
                <Text key={i} style={styles.scoreCell}>
                  {s.p2}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeCell]}>
                {p2Games}
              </Text>
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
                onPress={() => handleTennisScore(1)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.playerCardGlass}>
              <Text style={styles.actionName}>{p2Name || "P2"}</Text>
              <TouchableOpacity
                style={styles.scoreButton}
                onPress={() => handleTennisScore(2)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomActionsBox}>
            <TouchableOpacity
              style={styles.liveShareBtn}
              onPress={handleLiveShare}
            >
              <Text style={styles.liveShareBtnText}>📡 Share Live Score</Text>
            </TouchableOpacity>
            {history.length > 0 && (
              <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                <Text style={styles.undoButtonText}>↩ Undo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCurrentScreen("sportSelect");
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

  // Pure safety fallback to prevent unhandled states
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2b3a2e" },
  overlayDark: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  overlayLight: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  beachOverlay: {
    flex: 1,
    backgroundColor: "rgba(79, 164, 184, 0.75)",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  beachGlassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 20,
  },
  beachInput: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },

  sideChangeAlert: {
    backgroundColor: "#FFB347",
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  sideChangeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },

  headerArea: { marginBottom: 30, alignItems: "center" },
  mainTitle: {
    fontSize: 46,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  titleDivider: {
    height: 1,
    width: "40%",
    backgroundColor: "rgba(253, 246, 227, 0.4)",
    marginVertical: 8,
  },
  setupSubtitle: {
    fontSize: 18,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    opacity: 0.8,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 38,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    textAlign: "center",
    color: "#FDF6E3",
    marginBottom: 15,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 5,
  },
  Label: {
    fontSize: 19,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    position: "relative",
    backgroundColor: "transparent",
  },
  ballWrapperUnselected: { backgroundColor: "rgba(255, 255, 255, 0.28)" },
  ballWrapperSelected: { transform: [{ scale: 1.15 }] },
  imageMask: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 37.5,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  ballGraphicSelected: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.35 }],
  },
  ballContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  ballText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  ballSubText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    alignItems: "center",
  },
  scoreCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  nameCell: { flex: 2.5, textAlign: "left", fontWeight: "600", fontSize: 15 },
  activeHeaderCell: { color: "#DFFF00" },
  pointHeaderCell: { color: "#FFB347" },
  activeCell: {
    color: "#DFFF00",
    fontWeight: "600",
    fontSize: 18,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  pointCell: {
    color: "#FFB347",
    fontWeight: "800",
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  bottomActionsBox: {
    marginTop: "auto",
    marginBottom: 40,
    alignItems: "center",
    gap: 18,
  },
  liveShareBtn: {
    backgroundColor: "#FDF6E3",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#7a9e7e",
  },
  liveShareBtnText: { color: "#7a9e7e", fontWeight: "bold", fontSize: 16 },
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  cancelButton: { padding: 10 },
  cancelButtonText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  liveIndicator: {
    backgroundColor: "rgba(255,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "center",
  },
  liveIndicatorText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  victoryTitle: {
    fontSize: 48,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#DFFF00",
    textAlign: "center",
    marginBottom: 30,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 10,
  },
  victorySubtitle: {
    fontSize: 24,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    textAlign: "center",
    opacity: 0.8,
  },
  victoryScoreBox: { flexDirection: "row", gap: 15, marginBottom: 50 },
  victorySetCard: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  victorySetText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
  dbDate: {
    color: "#EEE",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbFormat: {
    color: "#DFFF00",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbWinnerText: { color: "#DFFF00", fontWeight: "900" },
  dbVsText: {
    color: "#AAA",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontSize: 14,
  },
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
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
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  clearButton: { padding: 15, alignItems: "center" },
  clearButtonText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
});
