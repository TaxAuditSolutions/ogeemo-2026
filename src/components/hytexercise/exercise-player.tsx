
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImagePlaceholder } from '../ui/image-placeholder';

export const EXERCISES = [
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

interface ExercisePlayerProps {
  breakDurationMinutes: number;
  onFinish: () => void;
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function ExercisePlayer({ breakDurationMinutes, onFinish }: ExercisePlayerProps) {
  const totalDurationSeconds = breakDurationMinutes * 60;
  const durationPerExercise = Math.floor(totalDurationSeconds / EXERCISES.length);
  const [timeLeft, setTimeLeft] = useState(totalDurationSeconds);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeInCurrentExercise, setTimeInCurrentExercise] = useState(0);

  const currentExercise = EXERCISES[currentExerciseIndex % EXERCISES.length];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
      setTimeInCurrentExercise(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinish]);

  useEffect(() => {
    if (timeInCurrentExercise >= durationPerExercise) {
      setCurrentExerciseIndex(prev => prev + 1);
      setTimeInCurrentExercise(0);
    }
  }, [timeInCurrentExercise, durationPerExercise]);
  
  const progress = ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100;

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center h-full">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{currentExercise.title}</CardTitle>
          <CardDescription>{currentExercise.instructions}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
            <ImagePlaceholder
                id={currentExercise.id}
                className="w-full h-full"
                key={currentExerciseIndex}
            />
          </div>
          <div className="text-sm space-y-2 text-left bg-muted/50 p-4 rounded-lg">
             <p><strong className="text-foreground">Movement:</strong> {currentExercise.movement}</p>
             <p><strong className="text-foreground">Repetitions:</strong> {currentExercise.repetitions}</p>
             <p className="italic border-l-4 border-primary pl-2"><strong className="text-foreground">Tip:</strong> {currentExercise.tip}</p>
          </div>
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Time left: {formatTime(timeLeft)}</span>
              <span>Total Break Time: {formatTime(totalDurationSeconds)}</span>
            </div>
          </div>
        </CardContent>
        <div className="p-6 pt-0 flex justify-center">
            <Button onClick={onFinish}>End Break Early</Button>
        </div>
      </Card>
    </div>
  );
}
