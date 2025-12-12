
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImagePlaceholder } from '../ui/image-placeholder';

const exercises = [
  { name: 'Neck Tilts', description: 'Slowly tilt your head from side to side, holding for 15 seconds on each side.', duration: 30, hint: 'neck stretch' },
  { name: 'Wrist Circles', description: 'Extend your arms and gently rotate your wrists clockwise, then counter-clockwise.', duration: 30, hint: 'wrist stretch' },
  { name: 'Shoulder Shrugs', description: 'Raise your shoulders towards your ears, hold for a few seconds, and then relax.', duration: 30, hint: 'shoulder stretch' },
  { name: 'Seated Spinal Twist', description: 'Turn your upper body to one side, using your chair for support. Hold, then switch sides.', duration: 60, hint: 'back stretch' },
  { name: 'Leg Extensions', description: 'While seated, extend one leg straight out and hold. Lower it and switch to the other leg.', duration: 30, hint: 'leg stretch' },
  { name: 'Ankle Rotations', description: 'Lift one foot slightly off the ground and rotate your ankle in both directions. Switch feet.', duration: 30, hint: 'ankle stretch' },
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
  const [timeLeft, setTimeLeft] = useState(totalDurationSeconds);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeInCurrentExercise, setTimeInCurrentExercise] = useState(0);

  const currentExercise = exercises[currentExerciseIndex % exercises.length];

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
    if (timeInCurrentExercise >= currentExercise.duration) {
      setCurrentExerciseIndex(prev => prev + 1);
      setTimeInCurrentExercise(0);
    }
  }, [timeInCurrentExercise, currentExercise.duration]);
  
  const progress = ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100;

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center h-full">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{currentExercise.name}</CardTitle>
          <CardDescription>{currentExercise.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
            <ImagePlaceholder
                data-ai-hint={currentExercise.hint}
                className="w-full h-full"
                key={currentExerciseIndex}
            />
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
