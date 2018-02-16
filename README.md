# Harpa IO - Machine learning playground

## Determining intensity of MIDI input

1. I recorded 10 active (or intense) and 10 passive (or gentle) sequences of MIDI using `programs/record-test-data.js`.
2. The data was then normalised and used to train a KNN algorithm to be able to tell wether a sequence of time intervals was considered active or passive (in `programs/determine-arousal.js`.
3. Using that trained algorithm, `programs/determine-arousal-realtime.js` tells you whether your current MIDI activity is active or passive. To try it out, plug in some MIDI controller and wiggle about.
