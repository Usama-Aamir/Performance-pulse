import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChannelList from '@/components/chat/ChannelList';
import ChatPanel from '@/components/chat/ChatPanel';

const MessagesPage = () => {
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 md:ml-60 h-screen">
        <ChannelList
          selectedChannelId={selectedChannel?.id}
          onSelectChannel={handleSelectChannel}
        />
        <ChatPanel channel={selectedChannel} />
      </div>
    </div>
  );
};

export default MessagesPage;
