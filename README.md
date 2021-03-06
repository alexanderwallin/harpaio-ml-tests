# Harpa IO - Machine learning playground

## Determining intensity of MIDI input

1. I recorded 10 active (or intense) and 10 passive (or gentle) sequences of MIDI using `programs/record-test-data.js`.
2. The data was then normalised and used to train a KNN algorithm to be able to tell wether a sequence of time intervals (i.e. the times between each MIDI event) is considered active/intense or passive/gentle (in `programs/determine-arousal.js`).
3. Using that trained algorithm, `programs/determine-arousal-realtime.js` tells you whether your current MIDI activity is active or passive. To try it out, plug in some MIDI controller and wiggle about.

This will be extended to cover different aspects of controls as well as more granularly.

## Controlling an Ableton filter from MIDI intensity

```sh
# 1. Open the Ableton live set
# 2. In the OSC Receiver plugin, set the OSC address to /1/filter/freq
# 3. Run:
node programs/control-filter.js

# 4. When you change any MIDI controls, the filter should close on low-intensity input and open up on high-intensity input.
```
