use pnet::packet::ethernet::{EtherTypes, EthernetPacket};
use pnet::packet::ip::IpNextHeaderProtocols;
use pnet::packet::ipv4::Ipv4Packet;
use pnet::packet::tcp::TcpPacket;
use pnet::packet::udp::UdpPacket;
use pnet::packet::Packet;
use std::net::IpAddr;

use crate::flow_tracker::FiveTuple;

pub struct ParsedPacket {
    pub five_tuple: Option<FiveTuple>,
    pub packet_len: u64,
    pub tcp_flags: u8,
    pub protocol_name: String,
}

pub fn parse_packet(data: &[u8]) -> Option<ParsedPacket> {
    let ethernet = EthernetPacket::new(data)?;

    match ethernet.get_ethertype() {
        EtherTypes::Ipv4 => {
            let ipv4 = Ipv4Packet::new(ethernet.payload())?;
            let src_ip = IpAddr::V4(ipv4.get_source());
            let dst_ip = IpAddr::V4(ipv4.get_destination());
            let protocol = ipv4.get_next_level_protocol();

            match protocol {
                IpNextHeaderProtocols::Tcp => {
                    let tcp = TcpPacket::new(ipv4.payload())?;
                    let five_tuple = FiveTuple {
                        src_ip,
                        dst_ip,
                        src_port: tcp.get_source(),
                        dst_port: tcp.get_destination(),
                        protocol: 6, // TCP
                    };

                    Some(ParsedPacket {
                        five_tuple: Some(five_tuple),
                        packet_len: data.len() as u64,
                        tcp_flags: tcp.get_flags(),
                        protocol_name: "TCP".to_string(),
                    })
                }
                IpNextHeaderProtocols::Udp => {
                    let udp = UdpPacket::new(ipv4.payload())?;
                    let five_tuple = FiveTuple {
                        src_ip,
                        dst_ip,
                        src_port: udp.get_source(),
                        dst_port: udp.get_destination(),
                        protocol: 17, // UDP
                    };

                    Some(ParsedPacket {
                        five_tuple: Some(five_tuple),
                        packet_len: data.len() as u64,
                        tcp_flags: 0,
                        protocol_name: "UDP".to_string(),
                    })
                }
                _ => Some(ParsedPacket {
                    five_tuple: None,
                    packet_len: data.len() as u64,
                    tcp_flags: 0,
                    protocol_name: format!("IP-{}", protocol.0),
                }),
            }
        }
        _ => Some(ParsedPacket {
            five_tuple: None,
            packet_len: data.len() as u64,
            tcp_flags: 0,
            protocol_name: format!("Ethernet-{:?}", ethernet.get_ethertype()),
        }),
    }
}
