---
layout: project-detail
title: Software-Defined Radio Implementation of Age-of-Information-Oriented Random Access
id: software-defined-rad
permalink: /projects/software-defined-rad.html
image: /assets/img/projects/software-defined-rad.png
link: https://ieeexplore.ieee.org/abstract/document/9254614/
pdf: /assets/pdf/Software-Defined Radio Implementation of Age-of-Information-Oriented Random Access.pdf
tech:
  - Software-defined Radio
  - Age of Information
  - Random Access
  - USRP
  - GNURadio
categories: projects
date: 2020-11-10
---

## Overview

This project presents the first practical Software-Defined Radio (SDR) implementation of Age-of-Information (AoI) oriented random access protocols. Using USRP N210 and GNURadio, we implemented and compared multiple random access schemes, demonstrating the effectiveness of AoI-based scheduling in real-world scenarios.

## Background: Age of Information

### What is Age of Information?

Age of Information (AoI) is a **freshness metric** that measures the time elapsed since the most recently received packet was generated at the source.

**Key Characteristics**:
- **Timeliness**: Measures how "fresh" the information is
- **Destination-Centric**: Focuses on receiver's perspective
- **Application-Driven**: Critical for status update systems

**Applications**:
- Networked control systems
- Environmental monitoring
- Real-time sensing
- Autonomous vehicles

### AoI vs. Traditional Metrics

| Metric | Focus | Application |
|--------|-------|-------------|
| **Latency** | Packet delivery delay | Real-time communications |
| **Throughput** | Data rate | File transfers, streaming |
| **AoI** | Information freshness | Status updates, sensing |

## Motivation

### The Challenge

Traditional random access protocols (e.g., Aloha, CSMA) optimize for **throughput** or **latency**, but not **information freshness**.

**Problem**: These schemes may lead to:
- **Stale information**: Long gaps between updates
- **Inefficient updates**: Multiple stale packets arriving together
- **Poor timeliness**: Suboptimal for status update systems

### Our Approach

We design and implement AoI-oriented random access that:
1. **Minimizes Age**: Optimizes information freshness
2. **Practical**: Works on real hardware
3. **Simple**: Easy to deploy in existing systems

## System Design

### Two-Level Updating Mechanism

Our key innovation is a **two-level updating scheme** that reduces both peak and average AoI.

#### Concept

```
Traditional Scheme:            Our Two-Level Scheme:
┌────┐  ┌────┐  ┌────┐        ┌────┐  ┌────┐  ┌────┐
│ Tx │──│ Rx │──│ App│        │ Tx │──│ Rx │──│ App│
└────┘  └────┘  └────┘        └────┘  └────┘  └────┘
   │                            │
   └─> Generate at will         └─> Level 1: Time-based
                                  └─> Level 2: AoI-based (if needed)
```

#### Algorithm

**Level 1: Time-Based Updates**
- Transmit at regular intervals (baseline)
- Ensures minimum update rate

**Level 2: AoI-Based Updates**
- If AoI exceeds threshold, trigger immediate update
- Reduces peak age significantly

**Benefits**:
- **30% reduction** in peak AoI
- **20% reduction** in average AoI
- Simple to implement (minimal overhead)

### Hardware Architecture

```
┌─────────────────────────────────────────┐
│         Transmitter Node                │
│  ┌─────────────────────────────────┐   │
│  │  Application (AoI Monitor)      │   │
│  ├─────────────────────────────────┤   │
│  │  Scheduler (Two-Level Logic)    │   │
│  ├─────────────────────────────────┤   │
│  │  GNU Radio Transmitter          │   │
│  │  - Frame Creation               │   │
│  │  - Modulation (BPSK/QPSK)       │   │
│  └─────────────────────────────────┘   │
│            │                             │
│  ┌─────────┴──────────┐                 │
│  │   USRP N210        │                 │
│  │   - DAC            │                 │
│  │   - RF Front-end   │                 │
│  └────────────────────┘                 │
└─────────────────────────────────────────┘
            │ Wireless Channel
            ↓
┌─────────────────────────────────────────┐
│         Receiver Node                   │
│  ┌─────────────────────────────────┐   │
│  │   USRP N210                     │   │
│  │   - ADC                         │   │
│  │   - RF Front-end                │   │
│  └─────────┬───────────────────────┘   │
│            │                             │
│  ┌─────────┴─────────────────────────┐ │
│  │  GNU Radio Receiver               │ │
│  │  - Demodulation                   │ │
│  │  - Frame Detection                │ │
│  │  - Timestamping                   │ │
│  ├──────────────────────────────────┤ │
│  │  AoI Calculator                  │ │
│  │  - Track packet generation time  │ │
│  │  - Compute current age           │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Details

### Hardware Specifications

**USRP N210 Configuration**:
- **Frequency**: 2.4 GHz (ISM band)
- **Bandwidth**: 500 kHz - 2 MHz
- **TX Power**: 0-20 dBm (adjustable)
- **Sample Rate**: 1 MSps

**Antenna**: Vertically polarized omnidirectional (2 dBi gain)

### Software Stack

**GNU Radio Companion (GRC) Flowgraph**:
- **Transmitter**:
  - Packet generation with timestamps
  - BPSK modulation
  - RRC pulse shaping
  - UPSR transmission

- **Receiver**:
  - USRP source block
  - Carrier frequency offset correction
  - Symbol timing recovery
  - Packet header detection
  - Payload extraction
  - AoI calculation

**Python Integration**:
- Real-time AoI monitoring
- Dynamic threshold adjustment
- Performance logging

## Experimental Evaluation

### Setup

**Topology**: Single transmitter, single receiver
**Duration**: 10+ minutes per experiment
**Metrics**: Average AoI, Peak AoI, Throughput

### Schemes Compared

1. **Baseline**: Traditional Slotted Aloha
   - Fixed transmission probability
   - No AoI awareness

2. **With Grouping**: Slotted Aloha with transmission groups
   - Users assigned to time slots
   - Reduced collision probability

3. **Two-Level (Ours)**: Proposed AoI-oriented scheme
   - Time-based + AoI-based updates
   - Dynamic threshold adaptation

### Results

#### Age Performance

| Scheme | Avg AoI (slots) | Peak AoI (slots) | Improvement |
|--------|-----------------|------------------|-------------|
| Baseline | 8.5 | 18.0 | - |
| With Grouping | 7.2 | 15.5 | 15% / 14% |
| **Two-Level (Ours)** | **6.8** | **12.6** | **20% / 30%** |

#### Trade-offs

| Metric | Baseline | Two-Level |
|--------|----------|-----------|
| Average AoI | 8.5 | 6.8 (↓20%) |
| Peak AoI | 18.0 | 12.6 (↓30%) |
| Throughput | 0.35 | 0.32 (↓8%) |
| Complexity | Low | Medium |

**Analysis**:
- Small throughput sacrifice (8%) for significant AoI reduction (20-30%)
- Worthwhile trade-off for status update applications
- Complexity increase is manageable

### Validation vs Theory

**Theoretical Model**: Based on discrete-time Markov chain
**Experimental Results**: Match theoretical predictions within 5%

```
Average AoI Comparison:
Theory: 6.5 slots
Experiment: 6.8 slots
Error: 4.6% ✓
```

## Key Insights

### 1. Two-Level is Effective

The two-level mechanism provides:
- **Better than baseline**: Significantly reduces AoI
- **Simple to implement**: Minimal additional complexity
- **Robust**: Works across different conditions

### 2. Peak AoI Matters Most

For status update systems:
- **Peak AoI** determines worst-case staleness
- **Average AoI** determines typical performance
- Two-level scheme improves both, especially peak

### 3. Hardware Validation is Critical

**Theoretical predictions alone are insufficient**:
- Real-world effects (clock drift, interference) impact performance
- Hardware implementation reveals practical challenges
- Our experiments confirm theoretical analysis

### 4. Simplicity Wins

Complex schemes with marginal gains may not be worth it:
- Two-level scheme achieves 80% of optimal with 20% complexity
- Good enough for practical deployment
- Room for optimization in future work

## Applications

This implementation is suitable for:

### 1. Industrial IoT
- Sensor networks monitoring equipment status
- Real-time condition updates
- Predictive maintenance systems

### 2. Smart Grid
- Power consumption monitoring
- Fault detection and reporting
- Distributed control systems

### 3. Autonomous Systems
- Vehicle-to-vehicle communication
- Drone status updates
- Robotic swarm coordination

### 4. Environmental Monitoring
- Weather stations
- Air quality sensors
- Water quality monitoring

## Challenges and Solutions

### Challenge 1: Synchronization

**Problem**: Distributed nodes need synchronized time slots

**Solution**:
- Use GPS-disciplined oscillators
- Beacon-based synchronization
- Compensate for clock drift

### Challenge 2: Dynamic Thresholds

**Problem**: Optimal AoI threshold varies with conditions

**Solution**:
- Adaptive threshold adjustment
- Machine learning-based optimization
- Feedback control loop

### Challenge 3: Scalability

**Problem**: Performance degrades with many users

**Solution**:
- Multi-channel extension
- Group-based scheduling
- Hybrid schemes (combine with traditional protocols)

## Future Work

1. **Multi-Hop Networks**: Extend to relay scenarios
2. **Machine Learning**: Adaptive threshold optimization
3. **Network Coding**: Combine with PNC for efficiency
4. **Large-Scale Testbed**: Deploy 10+ nodes
5. **Standardization**: Propose for IEEE 802.11 / BLE standards

## Publication

**Software-Defined Radio Implementation of Age-of-Information-Oriented Random Access**

Zhiyuan Han*, **Jiaxin Liang***, Yu Gu, Hao Chen
(\* Two authors have the same contributions)

*2020 The 46th Annual Conference of the IEEE Industrial Electronics Society (IECON), pp. 4374-4379*

[DOI: 10.1109/IECON43393.2020.9254614](https://doi.org/10.1109/IECON43393.2020.9254614)

[PDF](/assets/pdf/Software-Defined Radio Implementation of Age-of-Information-Oriented Random Access.pdf)

[arXiv](https://arxiv.org/abs/2003.14329)

## Impact

**First practical implementation** of AoI-oriented random access, enabling:
- Real-world validation of theoretical AoI schemes
- Experimental platform for future research
- Path toward commercial deployment

This work demonstrates that **age-based protocols are not just theoretically interesting** but **practically viable** for next-generation status update systems.
