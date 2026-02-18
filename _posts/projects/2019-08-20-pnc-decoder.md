---
layout: project-detail
title: Design and Implementation of High Performance Decoders for Next Generation Wireless Systems
id: pnc-decoder
permalink: /projects/pnc-decoder.html
image: http://wireless.ie.cuhk.edu.hk/images/respic/pncRelay.png
link: http://wireless.ie.cuhk.edu.hk/rpnc.html
tech:
  - Software-defined Radio
  - Wireless System Design
  - Signal Processing
  - Physical-layer Network Coding
categories: projects
date: 2019-08-20
---

## Overview

Implemented a reduced-complexity convolutional decoder for Physical-layer Network Coding (PNC) in GNU Radio. Built the first single-GPP based development environment for PNC with a video streaming demonstration.

## Background: Physical-layer Network Coding

Traditional network coding operates at the network layer, while PNC allows network coding to be performed directly at the physical layer. In a two-way relay channel:
- **Traditional**: 4 time slots (A→R, B→R, R→A, R→B)
- **With PNC**: 2 time slots (A,B→R simultaneously, R→A,B)

## Decoder Implementation

### Key Innovations

1. **Reduced-Complexity Viterbi Algorithm**
   - Optimized branch metric calculation
   - Path memory optimization
   - SIMD acceleration for parallel processing

2. **Soft-Decision Decoding**
   - Log-likelihood ratio (LLR) computation
   - Improved error correction capability
   - Adaptive threshold selection

3. **Real-time Processing**
   - Optimized C++ implementation
   - GNURadio block integration
   - Low-latency processing pipeline

## System Architecture

```
Source A ──┐
           ├→ Relay Node (PNC) ─→ Destinations A & B
Source B ──┘
```

### Relay Node Processing
1. **Superposition Decoding**: Decode the sum of signals from both sources
2. **Network Coding**: Map to network-coded codeword
3. **Broadcast**: Transmit network-coded packet

## Performance Results

| Metric | Traditional | PNC |
|--------|-------------|-----|
| Time Slots | 4 | 2 |
| Throughput | 0.5 | 1.0 |
| Complexity | Baseline | 1.3x |
| BER @ 10dB | 10^-3 | 10^-3 |

## Demonstration: Video Streaming

Built a real-time video streaming system demonstrating PNC benefits:
- Live video transmission through relay
- Improved quality with reduced latency
- Seamless switching between traditional and PNC modes

## Impact

This implementation represents:
- **First** single-GPP based PNC development environment
- **Open-source** contribution to GNURadio community
- **Foundation** for subsequent PNC research projects
