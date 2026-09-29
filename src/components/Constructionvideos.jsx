import React from 'react';

export default function ConstructionVideos({ videos = [] }){
  const defaultVideos = [
    { id: 1, title: "Foundation Work", url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500" },
    { id: 2, title: "Block Work - 80% Done", url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1541888946425-d81bb19240f6?w=500" },
  ];
  const list = videos.length? videos : defaultVideos;

  return (
    <div className="mt-6">
      <h3 className="font-bold text-[16px] mb-3">🚧 Construction Progress (Live)</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {list.map(v => (
          <div key={v.id} className="min-w-[220px] bg-black rounded-[16px] overflow-hidden relative">
            <video src={v.url} poster={v.thumb} controls className="w-full h-[140px] object-cover" />
            <div className="p-2 bg-white">
              <p className="text-[13px] font-semibold">{v.title}</p>
              <span className="text-[11px] text-white bg-red-500 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
