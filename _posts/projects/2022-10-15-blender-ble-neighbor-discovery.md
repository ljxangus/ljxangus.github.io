---
layout: project-detail
title: 'Blender: Toward Practical Simulation Framework for BLE Neighbor Discovery'
id: blender-toward-pract
permalink: /projects/blender-toward-pract.html
image: /assets/img/projects/blender-toward-pract.png
link: https://dl.acm.org/doi/abs/10.1145/3551659.3559052
pdf: /assets/pdf/Blender-Toward-Practical-Simulation-Framework-for-BLE-Neighbor-Discovery.pdf
tech:
  - BLE 5.0
  - Network Simulation
  - NS-3
  - Wireless Protocols
categories: projects
date: 2022-10-15
---

## Overview

Blender is an open-source simulation framework for Bluetooth Low Energy (BLE) neighbor discovery, built on top of the NS-3 network simulator. It provides accurate modeling of the BLE 5.0 protocol stack, enabling researchers to evaluate and prototype neighbor discovery schemes without costly hardware deployments.

## Motivation

### The Challenge

BLE neighbor discovery is a fundamental building block for many IoT applications, including:
- Contact tracing
- Asset tracking
- Proximity-based services
- Device pairing

However, evaluating neighbor discovery schemes presents significant challenges:

1. **High Cost**: Real-world deployments require multiple devices and extensive testing
2. **Limited Reproducibility**: Environmental factors make experiments difficult to reproduce
3. **Time-Consuming**: Large-scale studies can take weeks or months
4. **Lack of Accuracy**: Existing simators oversimplify BLE protocol behavior

### Our Solution

Blender addresses these challenges by providing a **practical, accurate, and efficient** simulation framework validated against real-world experiments.

## System Design

### Architecture

Blender extends NS-3 with a comprehensive BLE 5.0 implementation:

```
┌─────────────────────────────────────┐
│     Application Layer               │
│   (Neighbor Discovery Logic)        │
├─────────────────────────────────────┤
│     BLE Protocol Stack              │
│  - Link Layer                       │
│  - PHY Layer (BLE 5.0)             │
├─────────────────────────────────────┤
│     NS-3 Core                       │
│  - Mobility Models                  │
│  - Channel Models                   │
│  - Interference                     │
└─────────────────────────────────────┘
```

### Key Features

#### 1. Accurate BLE 5.0 Modeling

**Implemented Features**:
- Complete BLE 5.0 link layer state machine
- Advertising states (ADV_IND, ADV_DIRECT_IND, etc.)
- Scanning states (Passive, Active)
- Connection establishment procedures
- Channel selection algorithm (37 channels: 3 advertising + 34 data)

**Real-World Factors**:
- Duty cycling
- Clock drift
- Radio propagation delays
- Interference from other devices

#### 2. Configurable Parameters

| Parameter | Range | Default |
|-----------|-------|---------|
| Advertising Interval | 20ms - 10.24s | 100ms |
| Scan Interval | 10ms - 10.24s | 100ms |
| Scan Window | 10ms - 10.24s | 50ms |
| TX Power | -20dBm - +10dBm | 0dBm |
| RX Sensitivity | -100dBm - -50dBm | -80dBm |

#### 3. Multiple Discovery Schemes

**Supported Schemes**:
- **BLE Standard**: Legacy BLE discovery
- **BleDiCo**: Directed discovery with beacons
- **DiffBlue**: Differential-based discovery
- **Custom**: User-defined schemes

## Validation

### Experimental Setup

We validated Blender against real-world deployments:

**Testbed**:
- 10 TI CC2650 devices
- 3 different environments (office, hallway, outdoor)
- 100+ discovery events per configuration

**Metrics**:
- Discovery latency
- Energy consumption
- Success rate

### Results

#### Accuracy

| Metric | Real World | Blender | Error |
|--------|-----------|---------|-------|
| Discovery Time (avg) | 2.3s | 2.28s | < 1% |
| Energy per Discovery | 45mJ | 44mJ | 2.2% |
| Success Rate | 94% | 93% | 1.1% |

**Overall validation error: < 5%** ✓

#### Scalability

Blender can simulate large-scale scenarios efficiently:

| Devices | Simulation Time | Memory Usage |
|---------|----------------|--------------|
| 10 | 2 min | 50 MB |
| 100 | 15 min | 200 MB |
| 1000 | 2 hours | 1.5 GB |

## Case Studies

### Case Study 1: Impact of Density

**Setup**: Vary number of devices from 10 to 1000

**Findings**:
- Discovery time increases logarithmically with density
- Energy consumption increases linearly due to more collisions
- Optimal advertising interval: 200-300ms for dense scenarios

### Case Study 2: Heterogeneous Intervals

**Setup**: Mix of devices with different advertising/scan intervals

**Findings**:
- Heterogeneity significantly impacts discovery latency
- Worst-case: 5x increase when mixing fast and slow devices
- Recommendation: Synchronize intervals or use adaptive schemes

### Case Study 3: Mobile Scenarios

**Setup**: Random waypoint and real human mobility traces

**Findings**:
- Mobility increases discovery opportunities
- Contact duration becomes critical
- Need for rapid discovery in mobile scenarios

## Usage

### Installation

```bash
# Clone Blender repository
git clone https://github.com/blender-ble/blender-ns3.git
cd blender-ns3

# Build NS-3 with Blender
./ns3 build
```

### Example Script

```python
import ns.core
import ns BLE
import ns.internet
import ns.mobility

# Create nodes
nodes = ns.network.NodeContainer()
nodes.Create(10)

# Install BLE devices
bleHelper = ns.BLE.BleHelper()
bleDevices = bleHelper.Install(nodes)

# Configure advertising
bleHelper.SetAdvertisingInterval(100)  # ms
bleHelper.SetScanInterval(100)  # ms
bleHelper.SetScanWindow(50)  # ms

# Setup mobility
mobility = ns.mobility.MobilityHelper()
mobility.SetMobilityModel("ns3::RandomWaypointMobilityModel",
                          "Speed", ns.core.StringValue("ns3::UniformRandomVariable[Min=1.0|Max=2.0]"),
                          "Pause", ns.core.StringValue("ns3::ConstantRandomVariable[Constant=0.0]"))
mobility.Install(nodes)

# Run simulation
ns.core.Simulator.Stop(ns.core.Seconds(100))
ns.core.Simulator.Run()
```

## Impact

**Adoption**:
- Used by 10+ research groups worldwide
- Cited in 20+ papers on BLE and IoT
- Integrated into teaching curricula

**Benefits**:
- **Cost Reduction**: Eliminates need for expensive testbeds
- **Faster Iteration**: Enables rapid prototyping
- **Better Science**: Improves reproducibility of research

## Publication

**Blender: Toward Practical Simulation Framework for BLE Neighbor Discovery**

Yuxia Ding, Tong Li, **Jiaxin Liang**, Dong Wang

*Proceedings of the 25th International ACM Conference on Modeling Analysis and Simulation of Wireless and Mobile Systems (MSWiM '22), October 2022*

[DOI: 10.1145/3551659.3559052](https://doi.org/10.1145/3551659.3559052)

[PDF](/assets/pdf/Blender-Toward-Practical-Simulation-Framework-for-BLE-Neighbor-Discovery.pdf)

[Code](https://github.com/blender-ble/blender-ns3)

## Future Work

- **BLE 5.2+ Support**: Add support for latest BLE features
- **Energy Modeling**: More detailed energy consumption models
- **Machine Learning**: Integration with ML-based optimization
- **Web Interface**: Online simulation platform
