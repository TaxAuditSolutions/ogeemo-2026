
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { HeartPulse, Timer, Settings, PlayCircle, BarChart, OctagonAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExercisePlayer } from './exercise-player';
import { ImagePlaceholder } from '../ui/image-placeholder';


const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const HYTEXERCISE_STORAGE_KEY = 'hytexerciseState';

interface StoredState {
    isActive: boolean;
    breakDueTimestamp: number;
    breakFrequency: number;
    breakDuration: number;
}

const EXERCISES = [
  {
    id: 'hytexercise-1',
    title: '1. Seated Spinal Twist (Lower Back Relief)',
    instructions: 'Set up by sitting tall in your chair with your feet flat on the floor. Maintain a straight back throughout the entire movement.',
    movement: 'Cross the leg closest to your desk over your opposite leg. Gently place your opposite hand on the outside of your top knee or thigh. Twist from the waist, looking over your shoulder away from your desk. Use your other hand on the backrest or frame of the chair for light support.',
    duration: 'Hold the stretch for 15–30 seconds, breathing deeply into your lower back. Slowly return to the center.',
    repetitions: 'Repeat on the other side. Complete 2–3 sets per side.',
    tip: 'Focus on lengthening your spine upward as you twist rather than forcing a large, aggressive rotation.'
  },
  {
    id: 'hytexercise-2',
    title: '2. Hand and Wrist Rotations (Upper Extremity Mobility)',
    instructions: 'Sit tall in your office chair with your core engaged, keeping your feet flat on the floor and your shoulders dropped away from your ears.',
    movement: 'Extend both arms straight out in front of you, parallel to the desk and floor, with your palms open and relaxed. Gently and smoothly rotate your hands in small, controlled circles, initiating the movement entirely from your wrists.',
    duration: 'Perform 10 fluid rotations clockwise, then pause and perform 10 rotations counter-clockwise.',
    repetitions: 'Complete 3 full sets.',
    tip: 'Keep your fingers active but not tense, and avoid shrugging your shoulders upward toward your neck as you rotate your wrists.'
  },
  {
    id: 'hytexercise-3',
    title: '3. Seated Chest Opener and Shoulder Stretch (Chest Mobility)',
    instructions: 'Sit tall near the front edge of your chair with your feet planted flat on the floor, keeping your spine straight and core muscles engaged.',
    movement: 'Interlace your fingers behind your back or grasp the lower frame/backrest of your chair. Gently pull your elbows back and down while squeezing your shoulder blades tightly together, pressing your chest forward and upward.',
    duration: 'Hold the deep opening stretch for 15–30 seconds while taking slow, deep breaths into your chest. Slowly release your hands to return to a neutral posture.',
    repetitions: 'Relax for a few seconds, then repeat the stretch 2–3 times.',
    tip: 'Keep your neck completely relaxed and your chin level; avoid straining or letting your head drop backward as you lift your chest.'
  },
  {
    id: 'hytexercise-4',
    title: '4. Seated Leg Lifts / Knee Pull-In (Hip Flexors)',
    instructions: 'Set up by sitting tall toward the front half of your chair with good posture and your core firmly engaged.',
    movement: 'Slowly lift one knee up toward your chest, placing both hands on your shin or behind your thigh to gently pull the knee closer for an added stretch.',
    duration: 'Hold the lifted position for 2–3 seconds while breathing smoothly, then slowly lower your foot back to the floor.',
    repetitions: 'Perform 10–12 controlled repetitions on one side before switching to the other, or alternate legs. Complete 2–3 sets total.',
    tip: 'Avoid leaning back or rounding your spine as you lift your leg; keep your chest proud and your back straight throughout the entire movement.'
  },
  {
    id: 'hytexercise-5',
    title: '5. Seated Neck Rolls / Neck Stretch (Cervical Mobility)',
    instructions: 'Sit tall in your chair with your shoulders relaxed, away from your ears, and your feet flat on the floor.',
    movement: 'Gently drop your right ear toward your right shoulder. To increase the stretch, place your right hand on the side of your head for very light, passive leverage while extending your left arm down toward the floor.',
    duration: 'Hold the stretch for 15–30 seconds, breathing deeply into the side of your neck. Slowly return to the center.',
    repetitions: 'Complete 2–3 repetitions on one side, then switch to the left side. Alternatively, transition into slow, controlled half-circles by rolling your chin down across your chest to the other side.',
    tip: 'Do not force or pull your head down aggressively. The weight of your hand should be plenty to feel a deep, relaxing release in your upper trapezius and neck muscles.'
  },
  {
    id: 'hytexercise-6',
    title: '6. Seated Ankle Flex and Leg Extension (Lower Body Mobility)',
    instructions: 'Sit tall in your chair with your core engaged and your hands resting lightly on the armrests or sides of your seat for balance.',
    movement: 'Slowly extend one leg straight out in front of you until it is parallel to the floor. Once extended, actively flex your foot by pulling your toes back toward your shin, then point your toes away from you.',
    duration: 'Hold the leg extension while flexing and pointing your ankle 3–5 times, then slowly lower your foot back to the ground.',
    repetitions: 'Complete 10–12 repetitions on one leg before switching to the other side. Aim for 2–3 sets per leg.',
    tip: 'Keep your thigh muscles engaged to maintain the leg extension, and ensure your hips remain firmly planted in the chair without leaning backward.'
  }
];

export function HytexerciseView() {
  const [isActive, setIsActive] = useState(false);
  const [breakFrequency, setBreakFrequency] = useState(60);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(breakFrequency * 60);
  const [isBreakAlertOpen, setIsBreakAlertOpen] = useState(false);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [customDelay, setCustomDelay] = useState(5);

  const { toast } = useToast();

  const setTimer = useCallback((minutes: number) => {
    const dueTimestamp = Date.now() + minutes * 60 * 1000;
    const stateToStore: StoredState = {
        isActive: true,
        breakDueTimestamp: dueTimestamp,
        breakFrequency,
        breakDuration,
    };
    localStorage.setItem(HYTEXERCISE_STORAGE_KEY, JSON.stringify(stateToStore));
    setTimeLeft(minutes * 60);
  }, [breakFrequency, breakDuration]);

  // Load state from localStorage on initial mount
  useEffect(() => {
    try {
        const savedStateRaw = localStorage.getItem(HYTEXERCISE_STORAGE_KEY);
        if (savedStateRaw) {
            const savedState: StoredState = JSON.parse(savedStateRaw);
            setIsActive(savedState.isActive);
            setBreakFrequency(savedState.breakFrequency);
            setBreakDuration(savedState.breakDuration);

            if (savedState.isActive) {
                const remainingSeconds = Math.round((savedState.breakDueTimestamp - Date.now()) / 1000);
                if (remainingSeconds <= 0) {
                    setIsBreakAlertOpen(true);
                    setTimeLeft(0);
                } else {
                    setTimeLeft(remainingSeconds);
                }
            }
        }
    } catch (error) {
        console.error("Failed to load Hytexercise state:", error);
        localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
    }
  }, []);

  // Main timer tick effect
  useEffect(() => {
    if (!isActive || isBreakAlertOpen || isBreakActive) {
      return;
    }

    if (timeLeft <= 0) {
      setIsBreakAlertOpen(true);
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, timeLeft, isBreakAlertOpen, isBreakActive]);

  // Effect to handle toggling the timer on/off
  useEffect(() => {
    if (isActive) {
        // If timer is activated, set it based on frequency, but only if it's not already running from a loaded state.
        const savedStateRaw = localStorage.getItem(HYTEXERCISE_STORAGE_KEY);
        if (!savedStateRaw) {
            setTimer(breakFrequency);
        }
    } else {
        // If timer is deactivated, clear storage.
        localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
    }
  }, [isActive, breakFrequency, setTimer]);

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your Hytexercise preferences have been updated.",
    });
    if (isActive) {
        setTimer(breakFrequency);
    } else {
        setTimeLeft(breakFrequency * 60);
    }
  };
  
  const handleStartBreak = () => {
    setIsBreakAlertOpen(false);
    setIsBreakActive(true);
    localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
  };
  
  const handleDelayBreak = (delayMinutes: number) => {
    toast({
        title: "Break Delayed",
        description: `Your break has been delayed by ${delayMinutes} minutes.`,
    });
    setIsBreakAlertOpen(false);
    setTimer(delayMinutes);
  }
  
  const handleCancelBreak = () => {
    console.log(`Break canceled at ${new Date().toISOString()}. This event has been logged for reporting.`);
    toast({
        title: "Break Skipped",
        description: `Your next break reminder is scheduled in ${breakFrequency} minutes.`,
    });
    setIsBreakAlertOpen(false);
    setTimer(breakFrequency);
  };

  const handleFinishBreak = () => {
      setIsBreakActive(false);
      setTimer(breakFrequency);
      toast({
          title: "Thanks for protecting your health",
      });
  };
  
  if (isBreakActive) {
      return <ExercisePlayer breakDurationMinutes={breakDuration} onFinish={handleFinishBreak} />
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Hytexercise Wellness Manager</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Combat the effects of prolonged sitting and take charge of your well-being with guided, five-minute chair exercises every hour.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status & Controls Card */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5"/> Status & Controls</CardTitle>
              <CardDescription>Activate the app to start receiving break reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Hytexercise Active
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? "You will receive break alerts." : "Alerts are currently disabled."}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label="Activate Hytexercise"
                />
              </div>
              <div className="flex items-center text-lg">
                <Timer className="mr-3 h-6 w-6 text-primary"/>
                <div className="flex-1">
                  <span>Next break in:</span>
                  <span className="font-bold ml-2 font-mono">
                    {isActive ? formatTime(timeLeft) : 'Paused'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setIsBreakAlertOpen(true)}>
                    Test Break Alert
                </Button>
            </CardFooter>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/> Settings</CardTitle>
              <CardDescription>Customize your break schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Break Frequency (minutes)</Label>
                <Input id="frequency" type="number" value={breakFrequency} onChange={(e) => setBreakFrequency(Number(e.target.value))} placeholder="e.g., 60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Break Duration (minutes)</Label>
                <Input id="duration" type="number" value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} placeholder="e.g., 5" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </CardFooter>
          </Card>
          
          {/* Exercise List */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5"/> Exercise Routine</CardTitle>
              <CardDescription>Your 6-step hytexercise chair routine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {EXERCISES.map((ex) => (
                <div key={ex.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-b pb-8 last:border-0 last:pb-0">
                  <div className="md:col-span-1 aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden shadow-sm">
                      <ImagePlaceholder id={ex.id} className="w-full h-full" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                          <p className="text-white font-semibold text-sm drop-shadow-md">Image Placeholder</p>
                      </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-xl font-bold text-primary">{ex.title}</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Instructions:</strong> {ex.instructions}</p>
                      <p><strong className="text-foreground">Movement:</strong> {ex.movement}</p>
                      <p><strong className="text-foreground">Duration:</strong> {ex.duration}</p>
                      <p><strong className="text-foreground">Repetitions:</strong> {ex.repetitions}</p>
                      <p className="italic bg-muted/50 p-2 rounded border-l-4 border-primary"><strong className="text-foreground">Tip:</strong> {ex.tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" onClick={() => setIsBreakActive(true)}>Start Routine</Button>
            </CardFooter>
          </Card>
          
          {/* My Progress Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5"/> My Progress</CardTitle>
              <CardDescription>Track your consistency and see how you're doing over time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <p>Your activity report will be displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <AlertDialog open={isBreakAlertOpen} onOpenChange={setIsBreakAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-2xl">
                    <OctagonAlert className="h-8 w-8 text-destructive" />
                    Time for a break!
                </AlertDialogTitle>
                <AlertDialogDescription>
                    It's time for your scheduled {breakDuration}-minute exercise break. Take a moment to stretch and recharge.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="delay-select">Or, delay your break by:</Label>
              <Select
                  defaultValue={String(customDelay)}
                  onValueChange={(value) => setCustomDelay(Number(value))}
              >
                  <SelectTrigger id="delay-select">
                      <SelectValue placeholder="Select delay time" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={handleCancelBreak}>Cancel Break</Button>
              <div className="flex flex-col-reverse sm:flex-row sm:gap-2">
                <Button variant="outline" onClick={() => handleDelayBreak(customDelay)}>Delay Break</Button>
                <AlertDialogAction onClick={handleStartBreak}>Start Break Now</AlertDialogAction>
              </div>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
