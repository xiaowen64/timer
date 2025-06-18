// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // State management
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [repetitions, setRepetitions] = useState(3);
  const [currentRep, setCurrentRep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Refs for timer and speech
  const intervalRef = useRef(null);
  const speechSynthesis = useRef(null);
  const startTimeRef = useRef(0);
  const perRepSecondsRef = useRef(0);
  const femaleVoice = useRef(null);
  const speechQueue = useRef([]);
  const isSpeakingRef = useRef(false);

  // Initialize speech synthesis
  useEffect(() => {
    speechSynthesis.current = window.speechSynthesis;
    
    // Load voices and find a female voice
    const loadVoices = () => {
      const voices = speechSynthesis.current.getVoices();      
      femaleVoice.current = voices.find(voice => voice.name.toLowerCase().includes('zira'));
      
      // Fallback to first available voice if no female found
      if (!femaleVoice.current && voices.length > 0) {
        femaleVoice.current = voices[0];
      }
    };
    
    // Some browsers require this event
    speechSynthesis.current.onvoiceschanged = loadVoices;
    loadVoices();
    
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Calculate time per repetition
  useEffect(() => {
    const totalTimeInSeconds = totalMinutes * 60;
    const perRep = repetitions > 0 ? Math.round(totalTimeInSeconds / repetitions) : 0;
    perRepSecondsRef.current = perRep;
    if (!isActive) { setTimeLeft(perRep); }
  }, [totalMinutes, repetitions, isActive]);

  // Timer functionality
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleRepEnd();
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft]);

  // Synchronous speak function using promises
  const speak = async (text) => {
    return new Promise((resolve) => {
      if (!speechSynthesis.current || !femaleVoice.current) {
        resolve();
        return;
      }
      
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      
      // Cancel any ongoing speech
      speechSynthesis.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1;
      utterance.rate = 1.2;
      utterance.pitch = 1.2;
      utterance.voice = femaleVoice.current;
      
      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        resolve();
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        resolve();
      };
      
      speechSynthesis.current.speak(utterance);
    });
  };

  // Process speech queue
  const processSpeechQueue = async () => {
    while (speechQueue.current.length > 0) {
      const text = speechQueue.current[0];
      await speak(text);
      speechQueue.current.shift();
    }
  };

  // Add to speech queue and process
  const enqueueSpeech = (text) => {
    speechQueue.current.push(text);
    if (!isSpeakingRef.current) {
      processSpeechQueue();
    }
  };

  // Handle repetition end
  const handleRepEnd = async () => {
    clearInterval(intervalRef.current);
    
    if (currentRep < repetitions) {
      // Announce next repetition
      await speak(`Problem ${currentRep + 1}`);
      
      setCurrentRep(prev => prev + 1);
      setTimeLeft(perRepSecondsRef.current);
      startTimeRef.current = Date.now();
      
      // Continue timer
      if (isActive) {
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      }
    } else {
      setIsActive(false);
      setIsComplete(true);
      enqueueSpeech('All problems completed');
    }
  };

  // Start the timer
  const startTimer = async () => {
    if (!isActive) {
      // Reset if starting from completion
      if (isComplete) {
        setCurrentRep(1);
        setIsComplete(false);
      }
      
      // Set initial time
      setTimeLeft(perRepSecondsRef.current);
      startTimeRef.current = Date.now();
      setIsActive(true);
      
      // Announce first repetition
      await speak(`Problem ${currentRep}`);
    }
  };

  // Pause the timer
  const pauseTimer = () => {
    setIsActive(false);
  };

  // Reset the timer
  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsActive(false);
    setIsComplete(false);
    setCurrentRep(1);
    setTimeLeft(perRepSecondsRef.current);
    speechSynthesis.current.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    speechQueue.current = [];
  };

  // Skip current repetition
  const skipRepetition = async () => {
    if (!isActive) return;
    
    // Speak synchronously before handling rep end
    await speak(formatTimeMessage());
    handleRepEnd();
  };
  // Format time display
  const formatTimeMessage = () => {
    let elapsedMessage = "Good, you are ahead by ";
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (mins > 0) elapsedMessage += `${mins} minute${mins > 1 ? 's' : ''} `;
    if (secs > 0 || secs === 0) elapsedMessage += `${secs} second${secs !== 1 ? 's' : ''}`;

    return elapsedMessage;
  };

  // Format time display
  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time per repetition
  const formatPerRepTime = () => {
    const mins = Math.floor(perRepSecondsRef.current / 60);
    const secs = perRepSecondsRef.current % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Problem Timer</h1>
        <p>Time the progress as you go!</p>
      </div>
      
      <div className="card">
        <div className="controls">
          <div className="input-group">
            <label>Total Minutes:</label>
            <input 
              type="number" 
              value={totalMinutes} 
              onChange={(e) => setTotalMinutes(parseInt(e.target.value) || 0)}
              min="0"
              disabled={isActive || (currentRep > 1 && !isComplete) || isSpeaking}
            />
          </div>
          
          <div className="input-group">
            <label>Number of Problems:</label>
            <input 
              type="number" 
              value={repetitions} 
              onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
              min="1"
              disabled={isActive || (currentRep > 1 && !isComplete) || isSpeaking}
            />
          </div>
          
          <div className="summary">
            <p>Time per problem: <span>{formatPerRepTime()}</span></p>
          </div>
        </div>

        <div className="timer-display">
          <div className="repetition">Problem: {currentRep} / {repetitions}</div>
          <div className="time">{formatTime()}</div>
          <div className="status">
            {isComplete ? 'Completed!' : isActive ? 'Running...' : 'Ready'}
          </div>
        </div>

        <div className="buttons">
          {!isActive ? (
            <button 
              onClick={startTimer} 
              disabled={(totalMinutes === 0) || repetitions < 1 || isSpeaking}
            >
              Start
            </button>
          ) : (
            <>
              <button onClick={pauseTimer} disabled={isSpeaking}>Pause</button>
              <button onClick={skipRepetition} className="skip-btn" disabled={isSpeaking}>
                Completed
              </button>
            </>
          )}
          <button onClick={resetTimer} disabled={isSpeaking}>Reset</button>
        </div>
      </div>
      
      <div className="instructions">
        <h3>How to Use:</h3>
        <ol>
          <li>Enter the total time in minutes and the number of problems</li>
          <li>Click Start</li>
          <li>Use Completed to end current problem early</li>
        </ol>
      </div>
    </div>
  );
}

export default App;