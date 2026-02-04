import { AudioSegment, VideoResolution } from '../types';

export const generateFcpXml = (
  filename: string,
  segments: AudioSegment[],
  resolution: VideoResolution,
  fps: number = 30
): string => {
  const timebase = fps;
  const { width, height } = resolution;
  
  // Basic duration calculations
  let totalDuration = 0;
  segments.forEach(s => totalDuration += s.duration);

  // XML Header
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>${filename} (Edited)</name>
    <duration>${Math.round(totalDuration * timebase)}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>${timebase % 1 !== 0 ? 'TRUE' : 'FALSE'}</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>${timebase % 1 !== 0 ? 'TRUE' : 'FALSE'}</ntsc>
            </rate>
            <width>${width}</width>
            <height>${height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>
`;

  // VIDEO CLIPS
  let currentSequenceTime = 0;
  
  segments.forEach((seg, index) => {
    const inFrame = Math.floor(seg.start * timebase);
    const outFrame = Math.floor(seg.end * timebase);
    const durationFrames = outFrame - inFrame;
    const endSequenceTime = currentSequenceTime + durationFrames;

    xml += `          <clipitem id="clipitem-${index + 1}">
            <name>${filename}</name>
            <duration>${durationFrames}</duration>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>${timebase % 1 !== 0 ? 'TRUE' : 'FALSE'}</ntsc>
            </rate>
            <start>${currentSequenceTime}</start>
            <end>${endSequenceTime}</end>
            <in>${inFrame}</in>
            <out>${outFrame}</out>
            <file id="file-1">
              <name>${filename}</name>
              <pathurl>file://localhost/${filename}</pathurl>
              <rate>
                <timebase>${timebase}</timebase>
                <ntsc>${timebase % 1 !== 0 ? 'TRUE' : 'FALSE'}</ntsc>
              </rate>
              <media>
                <video>
                   <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                   </samplecharacteristics>
                </video>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                  <channelcount>2</channelcount>
                </audio>
              </media>
            </file>
          </clipitem>
`;
    currentSequenceTime = endSequenceTime;
  });

  xml += `        </track>
      </video>
      <audio>
        <track>
`;

  // AUDIO CLIPS (Track 1)
  currentSequenceTime = 0;
  segments.forEach((seg, index) => {
    const inFrame = Math.floor(seg.start * timebase);
    const outFrame = Math.floor(seg.end * timebase);
    const durationFrames = outFrame - inFrame;
    const endSequenceTime = currentSequenceTime + durationFrames;

    xml += `          <clipitem id="clipitem-audio1-${index + 1}">
            <name>${filename}</name>
            <duration>${durationFrames}</duration>
            <rate>
               <timebase>${timebase}</timebase>
               <ntsc>${timebase % 1 !== 0 ? 'TRUE' : 'FALSE'}</ntsc>
            </rate>
            <start>${currentSequenceTime}</start>
            <end>${endSequenceTime}</end>
            <in>${inFrame}</in>
            <out>${outFrame}</out>
            <file id="file-1"/> 
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
          </clipitem>
`;
    currentSequenceTime = endSequenceTime;
  });

   xml += `        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`;

  return xml;
};