import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Super-reliable PDF template designed to match the user's reference exactly.
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  // Summary Box (Like the "Workout Summary" in the photo)
  summaryBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  summaryLabelSide: {
    backgroundColor: '#f1f5f9',
    width: '25%',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  summaryLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  summaryContentSide: {
    width: '75%',
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 5,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#00e676',
    paddingBottom: 4,
  },
  
  // Table Design (Matching the photo)
  table: {
    width: 'auto',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#004d40', // Deep green for the header
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 30,
    alignItems: 'center',
  },
  col1: { width: '40%', padding: 8 },
  col2: { width: '15%', padding: 8, textAlign: 'center' },
  col3: { width: '45%', padding: 8 },
  
  headerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 10,
    color: '#334155',
  },
  cellTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    fontSize: 8,
    color: '#94a3b8',
  }
});

export interface Drill {
  id: string;
  name: string;
  duration: string;
  description: string;
}

export interface Session {
  title: string;
  date: string;
  playerName: string;
  drills: Drill[];
}

export const SessionPDFTemplate = ({ session }: { session: Session }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{session.title || 'TRAINING PROGRAM'}</Text>

      {/* Summary Section matching user's photo */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryLabelSide}>
          <Text style={styles.summaryLabelText}>Session Summary</Text>
        </View>
        <View style={styles.summaryContentSide}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>ATHLETE</Text>
            <Text style={styles.value}>{session.playerName || 'Athlete'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>DATE</Text>
            <Text style={styles.value}>{session.date || 'TBD'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>COACH</Text>
            <Text style={styles.value}>CoachPocket AI</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>TOTAL DRILLS</Text>
            <Text style={styles.value}>{session.drills.length}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Main Training Block</Text>

      <View style={styles.table}>
        {/* Header Row */}
        <View style={styles.tableHeader}>
          <View style={styles.col1}><Text style={styles.headerText}>Drill / Exercise</Text></View>
          <View style={styles.col2}><Text style={styles.headerText}>Time</Text></View>
          <View style={styles.col3}><Text style={styles.headerText}>Specific Instructions</Text></View>
        </View>

        {/* Data Rows */}
        {session.drills.map((drill, index) => (
          <View key={drill.id || index} style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
            <View style={styles.col1}>
              <Text style={styles.cellTextBold}>{drill.name}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.cellText}>{drill.duration}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.cellText}>{drill.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer} fixed>
        Generated by CoachPocket • High Performance Tennis Coaching • coachpocket.app
      </Text>
    </Page>
  </Document>
);
