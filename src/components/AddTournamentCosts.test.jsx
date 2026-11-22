import React from 'react';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddTournamentCosts from './AddTournamentCosts';
import * as api from '../api/client';
jest.mock('react-router-dom', () => ({useNavigate:() => jest.fn()}));
jest.mock('../api/client');
beforeEach(() => {api.fetchPlayers.mockResolvedValue([{name:'Alice'}]);api.fetchFundSettings.mockResolvedValue({default_venue_fee:10,default_ball_fee:20});});
test('calculates and saves costs through the session', async () => {
    api.calculateTournamentCosts.mockResolvedValue({total_venue_cost:10,total_ball_cost:0,total_misc_cost:0,total_cost:10,player_breakdowns:[]});
    api.saveTournamentCosts.mockResolvedValue({});
    const success=jest.fn();
    render(<AddTournamentCosts standalone={false} onSuccess={success} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'), {target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('combobox',{name:'Tournament Players'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    await waitFor(() => expect(api.calculateTournamentCosts).toHaveBeenCalledWith(expect.objectContaining({tournament_players:['Alice']})));
    await userEvent.click(await screen.findByRole('button',{name:'Save & Update Balances'}));
    await waitFor(() => expect(api.saveTournamentCosts).toHaveBeenCalledWith(expect.objectContaining({tournament_players:['Alice']})));
    expect(success).toHaveBeenCalled();
});

test('validates date and players, and auto-populates attendance', async () => {
    api.fetchTournamentPlayersByDate.mockResolvedValue({players:['Alice']});
    render(<AddTournamentCosts standalone={false} />);
    await userEvent.click(await screen.findByRole('button',{name:'Calculate Costs'}));
    expect(screen.getByText('Please select a tournament date')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Auto Populate Tournament Players'}));
    expect(screen.getByText('Please select a tournament date first')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    expect(screen.getByText('Please select tournament players')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Auto Populate Tournament Players'}));
    expect(await screen.findByText('Auto-populated 1 players')).toBeInTheDocument();
});

test('creates an unofficial tournament after an attendance lookup misses', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    api.fetchTournamentPlayersByDate.mockRejectedValue({response:{status:404}});
    api.createUnofficialTournament.mockResolvedValue({});
    render(<AddTournamentCosts standalone={false} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('button',{name:'Auto Populate Tournament Players'}));
    await userEvent.click(await screen.findByRole('button',{name:'Yes, This is Unofficial'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('combobox',{name:'Tournament Players'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('button',{name:'Create Unofficial Tournament Entry'}));
    await waitFor(() => expect(api.createUnofficialTournament).toHaveBeenCalledWith({date:'2026-10-24',tournament_players:['Alice']}));
    expect(await screen.findByText(/Unofficial tournament created successfully/)).toBeInTheDocument();
    log.mockRestore();
});

test('allows custom fees and player-specific costs', async () => {
    api.calculateTournamentCosts.mockResolvedValue({total_venue_cost:50,total_ball_cost:0,total_misc_cost:0,total_cost:50,player_breakdowns:[]});
    render(<AddTournamentCosts standalone={false} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('combobox',{name:'Tournament Players'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('checkbox',{name:/Use default venue fee/}));
    await userEvent.click(screen.getByRole('radio',{name:'Total Fee'}));
    fireEvent.change(screen.getByLabelText('Total Venue Fee'),{target:{value:'50'}});
    await userEvent.click(screen.getByRole('checkbox',{name:/Use default ball fee/}));
    fireEvent.change(screen.getByLabelText('Ball Fee (per ball)'),{target:{value:'20'}});
    fireEvent.change(screen.getByLabelText('Number of WTT Balls Purchased'),{target:{value:'2'}});
    fireEvent.change(screen.getByLabelText('Common Miscellaneous Cost Name (Optional)'),{target:{value:'Snacks'}});
    fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'10'}});
    await userEvent.click(screen.getByRole('button',{name:'Add Player Specific Miscellaneous Cost'}));
    await userEvent.click(screen.getByRole('combobox',{name:'Player Names'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    fireEvent.change(screen.getByLabelText('Cost Amount'),{target:{value:'5'}});
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    await waitFor(() => expect(api.calculateTournamentCosts).toHaveBeenCalledWith(expect.objectContaining({venue_fee_per_person:50,ball_fee_per_ball:20})));
    await userEvent.click(await screen.findByRole('button',{name:'Cancel'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button',{name:'Remove'}));
});

test('reports initial loading errors', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    api.fetchPlayers.mockRejectedValueOnce(new Error('Offline'));
    render(<AddTournamentCosts standalone={false} />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
    log.mockRestore();
});

test('loads saved input for editing and reports calculation errors', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    api.fetchTournamentCostInput.mockResolvedValue({use_default_venue_fee:false,use_default_ball_fee:false,venue_fee_per_person:10,ball_fee_per_ball:20,tournament_players:['Alice'],club_members:[],num_balls_purchased:1,common_misc_cost:0,common_misc_name:null,player_specific_costs:[]});
    api.calculateTournamentCosts.mockRejectedValueOnce({response:{data:{detail:'Calculation failed'}}});
    render(<AddTournamentCosts editDate="2026-10-24" standalone={false} />);
    expect(await screen.findByDisplayValue('2026-10-24')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    expect(await screen.findByText('Calculation failed')).toBeInTheDocument();
    log.mockRestore();
});

test('shows a detailed preview and reports save errors', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    api.calculateTournamentCosts.mockResolvedValue({total_venue_cost:10,total_ball_cost:0,total_misc_cost:0,total_cost:10,player_breakdowns:[{player_name:'Alice',is_club_member:true,venue_cost:0,ball_cost:0,common_misc_cost:0,player_specific_cost:0,total_cost:0}]});
    api.saveTournamentCosts.mockRejectedValueOnce({response:{data:{detail:'Save failed'}}});
    render(<AddTournamentCosts standalone={false} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('combobox',{name:'Tournament Players'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    expect(await screen.findByText('(Club)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Save & Update Balances'}));
    await userEvent.click(screen.getByRole('button',{name:'Cancel'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    log.mockRestore();
});

test('excludes club members from a shared venue fee', async () => {
    api.calculateTournamentCosts.mockResolvedValue({total_venue_cost:0,total_ball_cost:0,total_misc_cost:0,total_cost:0,player_breakdowns:[]});
    render(<AddTournamentCosts standalone={false} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('combobox',{name:'Tournament Players'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('combobox',{name:'Club Members (Optional)'}));
    await userEvent.click(screen.getByRole('option',{name:'Alice'}));
    await userEvent.click(screen.getByRole('checkbox',{name:/Use default venue fee/}));
    await userEvent.click(screen.getByRole('radio',{name:'Total Fee'}));
    fireEvent.change(screen.getByLabelText('Total Venue Fee'),{target:{value:'50'}});
    await userEvent.click(screen.getByRole('button',{name:'Calculate Costs'}));
    await waitFor(() => expect(api.calculateTournamentCosts).toHaveBeenCalledWith(expect.objectContaining({venue_fee_per_person:0,club_members:['Alice']})));
});

test('reports attendance lookup errors other than a missing tournament', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    api.fetchTournamentPlayersByDate.mockRejectedValueOnce({response:{status:500,data:{detail:'Lookup failed'}}});
    render(<AddTournamentCosts standalone={false} />);
    fireEvent.change(await screen.findByLabelText('Tournament Date'),{target:{value:'2026-10-24'}});
    await userEvent.click(screen.getByRole('button',{name:'Auto Populate Tournament Players'}));
    expect(await screen.findByText('Lookup failed')).toBeInTheDocument();
    log.mockRestore();
});
